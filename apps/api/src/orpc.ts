import {
  type ErrorBody,
  type ErrorCode,
  errorCodes,
  type InvalidRequestDetails,
  validationIssueCodeSchema,
} from "@fpr/contracts";
import type { Db } from "@fpr/db";
import { OpenAPIHandler } from "@orpc/openapi/node";
import { type AnyRouter, ORPCError, onError } from "@orpc/server";
import type { Express, Request, Response } from "express";
import type { Auth } from "./auth/auth.js";
import { logRefusal } from "./errors.js";
import type { RateLimiter } from "./pipeline/index.js";
import type { AvatarStore } from "./storage/avatar-store.js";

/**
 * What the process gives every request: its pool, Better Auth, picture
 * storage, and its origin.
 */
export interface ApiServices {
  db: Db;
  auth: Auth;
  /** The bucket profile pictures are kept in. */
  avatars: AvatarStore;
  /** `PUBLIC_URL`'s origin, such as `https://fpr.example.com`. */
  publicOrigin: string;
  /** `ADMIN_BOOTSTRAP_KEY`: the key `POST /setup` asks for. */
  bootstrapKey: string;
  /** `PSEUDONYM_SECRET`: the key pseudonyms are derived with. */
  pseudonymSecret: string;
  /** `RACE_TIMEZONE`: where a day starts. */
  raceTimeZone: string;
  /** The counts of the public writes' rate limit, per route and client address. */
  rateLimits: RateLimiter;
}

/** What every handler receives. */
export interface ApiContext extends ApiServices {
  req: Request;
  res: Response;
}

function isErrorCode(code: string): code is ErrorCode {
  return (errorCodes as readonly string[]).includes(code);
}

/**
 * The `invalid_request` details of oRPC's validation issues: each issue's path
 * and code, without Zod's text. A symbol in a path, which JSON can't carry,
 * and a code outside Zod's list, are left as `custom`.
 */
function toInvalidRequestDetails(issues: unknown): InvalidRequestDetails {
  return {
    issues: (Array.isArray(issues)
      ? (issues as { path?: readonly PropertyKey[]; code?: string }[])
      : []
    ).map(({ path = [], code }) => ({
      path: path.flatMap((key) =>
        typeof key === "symbol" ? [] : [key as string | number],
      ),
      code: validationIssueCodeSchema.catch("custom").parse(code),
    })),
  };
}

/**
 * FPR's error body for an oRPC error: a declared code as it is, oRPC's input
 * validation failure as `invalid_request` with each issue's path and code,
 * and anything else as `internal_error`, without its message.
 */
export function toErrorBody(error: ORPCError<string, unknown>): ErrorBody {
  if (isErrorCode(error.code)) {
    const data = error.data as Record<string, unknown> | undefined;
    return {
      error:
        data === undefined
          ? { code: error.code }
          : { code: error.code, details: data },
    };
  }
  if (error.code === "BAD_REQUEST") {
    const { issues } = (error.data ?? {}) as { issues?: unknown };
    return {
      error: {
        code: "invalid_request",
        details: toInvalidRequestDetails(issues),
      },
    };
  }
  return { error: { code: "internal_error" } };
}

/**
 * Logs a failed request: a refusal with a declared code, `invalid_request`
 * included, at `info`; anything else at `error`, with its stack.
 */
function logFailure(req: Request, error: unknown): void {
  if (
    error instanceof ORPCError &&
    (isErrorCode(error.code) || error.code === "BAD_REQUEST")
  ) {
    logRefusal(req, toErrorBody(error).error);
    return;
  }
  req.log.error({ err: error, requestId: req.id }, "unexpected error");
}

/**
 * Mounts an oRPC router under `/api`. A request no route matches goes on to
 * the next Express handler, so the not-found answer stays Express's.
 */
export function mountRouter(
  app: Express,
  router: AnyRouter,
  services: ApiServices,
): void {
  const handler = new OpenAPIHandler<ApiContext>(router, {
    // The status stays the error's own: a declared code carries FPR's, input
    // validation is 400, and an unexpected failure 500.
    customErrorResponseBodyEncoder: toErrorBody,
    clientInterceptors: [
      onError((error, { context }) => logFailure(context.req, error)),
    ],
  });

  app.use("/api", async (req, res, next) => {
    const { matched } = await handler.handle(req, res, {
      prefix: "/api",
      context: { ...services, req, res },
    });
    if (!matched) {
      next();
    }
  });
}
