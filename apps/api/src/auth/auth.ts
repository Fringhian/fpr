import { accessKeys, type Db } from "@fpr/db";
import { type BetterAuthOptions, betterAuth } from "better-auth";
import { APIError } from "better-auth/api";
import type { Logger } from "pino";
import { ipAddressOptions, rateLimitOptions } from "./rate-limit.js";
import { authSchema } from "./schema.js";

export const authBasePath = "/api/auth";

/** How long a session lasts: 30 days, extended on use. */
export const sessionMaxAgeSeconds = 30 * 24 * 60 * 60;

/** How often a session in use is extended: once a day at most. */
const sessionUpdateAgeSeconds = 24 * 60 * 60;

export const passwordLength = { min: 12, max: 128 } as const;

const emailAndPasswordOptions = {
  enabled: true,
  disableSignUp: true,
  minPasswordLength: passwordLength.min,
  maxPasswordLength: passwordLength.max,
} satisfies BetterAuthOptions["emailAndPassword"];

const sessionOptions = {
  ...authSchema.session,
  expiresIn: sessionMaxAgeSeconds,
  updateAge: sessionUpdateAgeSeconds,
} satisfies BetterAuthOptions["session"];

const advancedOptions = {
  ...authSchema.advanced,
  ipAddress: ipAddressOptions,
  disableOriginCheck: false,
  useSecureCookies: true,
  defaultCookieAttributes: {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
  },
} satisfies BetterAuthOptions["advanced"];

/**
 * Better Auth for FPR: email and password only, with no public sign-up and
 * no profile edits of its own. Sessions are HTTP-only, `Secure`,
 * `SameSite=Lax` cookies that last 30 days and are extended on use. Writes
 * are accepted from `PUBLIC_URL` alone, and password sign-ins are
 * rate-limited per client address, read from the `X-Forwarded-For` that
 * `web` sets. A request without one is not rate-limited.
 *
 * A session starts only for a person whose access key gives access, so a
 * person whose access ended is refused at sign-in with `access_ended`.
 *
 * Better Auth names its columns itself, so it gets the pool without the
 * camelCase plugin, which would rename the rows it reads back.
 */
export function createAuth({
  db,
  secret,
  baseURL,
  logger,
}: {
  db: Db;
  /** `BETTER_AUTH_SECRET`. */
  secret: string;
  /** `PUBLIC_URL`: the only origin Better Auth trusts. */
  baseURL: string;
  /** Receives Better Auth's warnings and errors as pino lines. */
  logger?: Logger;
}) {
  return betterAuth({
    ...authSchema,
    ...loggerOptions(logger),
    secret,
    baseURL,
    basePath: authBasePath,
    trustedOrigins: [baseURL],
    database: { db: db.withoutPlugins(), type: "postgres" },
    emailAndPassword: emailAndPasswordOptions,
    session: sessionOptions,
    rateLimit: rateLimitOptions(logger),
    advanced: advancedOptions,
    databaseHooks: accessCheckHooks(db),
    // A person's profile changes through PATCH /me, which checks it.
    disabledPaths: ["/update-user"],
  });
}

export type Auth = ReturnType<typeof createAuth>;

function loggerOptions(
  logger: Logger | undefined,
): Pick<BetterAuthOptions, "logger"> {
  if (logger === undefined) {
    return {};
  }
  return {
    logger: {
      level: "warn",
      log: (level, message, ...args: unknown[]) => {
        logger[level](args.length > 0 ? { args } : {}, message);
      },
    },
  };
}

/** Refuses a new session, with `access_ended`, once the person's access has ended. */
function accessCheckHooks(db: Db): BetterAuthOptions["databaseHooks"] {
  return {
    session: {
      create: {
        before: async (session) => {
          if (!(await accessKeys.hasAccess(db, session.userId))) {
            throw new APIError("UNAUTHORIZED", {
              code: "access_ended",
              message: "Your access has ended",
            });
          }
        },
      },
    },
  };
}
