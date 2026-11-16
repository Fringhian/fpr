import { isIP } from "node:net";
import type { BetterAuthOptions, BetterAuthRateLimitRule } from "better-auth";
import { getIP } from "better-auth/api";
import type { Logger } from "pino";

/** Password sign-ins each client address may try per window. */
export const signInRateLimit = { window: 60, max: 5 } as const;

/** Where Better Auth reads the client's address: the one `web` sets. */
const clientAddressHeader = "x-forwarded-for";

export const ipAddressOptions = {
  ipAddressHeaders: [clientAddressHeader],
} as const satisfies NonNullable<
  NonNullable<BetterAuthOptions["advanced"]>["ipAddress"]
>;

/**
 * Better Auth's rate limits, kept per client address. Better Auth turns them
 * off in tests and development by default. They stay on everywhere, so the
 * tests see what production does. The first rule matching a path applies:
 * sign-in, then every other path.
 */
export function rateLimitOptions(
  logger: Logger | undefined,
): NonNullable<BetterAuthOptions["rateLimit"]> {
  const perClientAddress = perClientAddressRules(logger);
  return {
    enabled: true,
    storage: "memory",
    customRules: {
      "/sign-in/*": perClientAddress(signInRateLimit),
      "/**": perClientAddress(),
    },
  };
}

/**
 * Builds rate limit rules kept per client address: `rule`, or the rule Better
 * Auth would apply. A request without a client address is not limited, so
 * one shared count never locks every client out. The first such request
 * is logged as an error.
 */
function perClientAddressRules(logger: Logger | undefined) {
  let missingAddressLogged = false;
  return (rule?: BetterAuthRateLimitRule) =>
    (request: Request, current: BetterAuthRateLimitRule) => {
      if (clientAddress(request) !== null) {
        return rule ?? current;
      }
      if (!missingAddressLogged) {
        missingAddressLogged = true;
        logger?.error(
          { path: new URL(request.url).pathname },
          "rate limit skipped: the request has no client address in X-Forwarded-For",
        );
      }
      return false;
    };
}

/**
 * The client address Better Auth keeps a request's rate limit for, or
 * `null` when the request has none: `X-Forwarded-For` must hold a single
 * IP address.
 */
function clientAddress(request: Request): string | null {
  const forwarded = request.headers.get(clientAddressHeader)?.trim() ?? "";
  return isIP(forwarded) === 0
    ? null
    : getIP(request, { advanced: { ipAddress: ipAddressOptions } });
}
