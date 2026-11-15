import { os } from "@orpc/server";
import { fromNodeHeaders } from "better-auth/node";
import { clientAddress } from "../auth.js";
import { apiError } from "../errors.js";
import type { ApiContext } from "../orpc.js";
import { isWrite, routeAccess } from "./route.js";

/** Requests each client address may send to one public write per window. */
export const publicWriteRateLimit = { window: 60, max: 5 } as const;

/** The outcome of counting one request. */
export type RateLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number };

/**
 * Counts requests per key in fixed windows, in memory. Each count lasts one
 * window from its first request. Counts past their window are dropped as
 * requests come in, so the map holds at most the keys seen within a window.
 */
export interface RateLimiter {
  /** Counts a request under `key`, and says whether it may go on. */
  consume(key: string): RateLimitDecision;
}

/** A rate limiter allowing `max` requests per key within `window` seconds. */
export function createRateLimiter(
  { window, max }: { window: number; max: number },
  clock: () => number = Date.now,
): RateLimiter {
  const windowMs = window * 1000;
  const counts = new Map<string, { count: number; resetAt: number }>();
  let nextSweep = 0;

  return {
    consume(key) {
      const now = clock();
      if (now >= nextSweep) {
        for (const [counted, entry] of counts) {
          if (entry.resetAt <= now) {
            counts.delete(counted);
          }
        }
        nextSweep = now + windowMs;
      }
      const entry = counts.get(key);
      if (entry === undefined || entry.resetAt <= now) {
        counts.set(key, { count: 1, resetAt: now + windowMs });
        return { allowed: true };
      }
      if (entry.count >= max) {
        return {
          allowed: false,
          retryAfterSeconds: Math.ceil((entry.resetAt - now) / 1000),
        };
      }
      entry.count += 1;
      return { allowed: true };
    },
  };
}

/** Whether a request without a client address was logged since the API started. */
let missingAddressLogged = false;

/**
 * The rate limit of public writes: setup, access links, and password
 * resets. Each client address gets `publicWriteRateLimit` per route, then
 * `429 rate_limited` with `Retry-After` until its window ends. The address
 * is read as for Better Auth's limits. A request without one is not
 * limited, so clients never share one count, and the first such request is
 * logged as an error.
 */
export const limitPublicWrites = os
  .$context<ApiContext>()
  .middleware(({ context, next, procedure }) => {
    if (routeAccess(procedure) !== "public" || !isWrite(procedure)) {
      return next();
    }
    const { req, res, rateLimits } = context;
    const address = clientAddress(fromNodeHeaders(req.headers));
    if (address === null) {
      if (!missingAddressLogged) {
        missingAddressLogged = true;
        req.log.error(
          { requestId: req.id, path: req.path },
          "rate limit skipped: the request has no client address in X-Forwarded-For",
        );
      }
      return next();
    }
    const { method = "POST", path = "" } = procedure["~orpc"].route;
    const decision = rateLimits.consume(`${method} ${path} ${address}`);
    if (!decision.allowed) {
      res.setHeader("Retry-After", String(decision.retryAfterSeconds));
      throw apiError("rate_limited");
    }
    return next();
  });
