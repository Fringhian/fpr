import { randomUUID } from "node:crypto";
import { type Db, ping } from "@fpr/db";
import type { AnyRouter } from "@orpc/server";
import { toNodeHandler } from "better-auth/node";
import express, {
  type Express,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import type { Logger } from "pino";
import { type HttpLogger, pinoHttp } from "pino-http";
import { type Auth, authBasePath } from "./auth/auth.js";
import { docsPath, docsRouter } from "./docs.js";
import { errorHandler, notFound } from "./errors.js";
import { mountRouter } from "./orpc.js";
import {
  authAccessCheck,
  createRateLimiter,
  publicWriteRateLimit,
} from "./pipeline/index.js";
import { apiRouter } from "./router.js";

export interface AppOptions {
  /** The contract routes served under `/api`. Defaults to every API route. */
  router?: AnyRouter;
  db: Db;
  /** Better Auth, served at `/api/auth/*`. */
  auth: Auth;
  /** `PUBLIC_URL`: the only origin a write is accepted from. */
  publicUrl: string;
  /** `ADMIN_BOOTSTRAP_KEY`: the key that creates the first admin. */
  bootstrapKey: string;
  logger: Logger;
  /** Serves the OpenAPI document and its viewer at `/api/docs`. */
  docs?: boolean;
  /** Mounts more routes before the not-found and error handlers. */
  routes?: (app: Express) => void;
}

/**
 * Builds the Express app: request logging, health, Better Auth, the contract
 * routes behind the request pipeline, the docs when asked, and error
 * handling.
 */
export function createApp({
  db,
  auth,
  publicUrl,
  bootstrapKey,
  logger,
  docs = false,
  router = apiRouter,
  routes,
}: AppOptions): Express {
  const app = express();

  // `web` is the one proxy in front of the API, and forwards the client's
  // address, resolved from the host's reverse proxy, as the only value of
  // X-Forwarded-For. The value 1 trusts that single hop and nothing beyond
  // it, so req.ip is the client's address, the one Better Auth's rate limits
  // are kept for.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(logRequests(logger));
  app.use(exposeRequestId);

  app.get("/health", healthCheck(db));

  if (docs) {
    app.use(docsPath, docsRouter());
  }

  // Better Auth reads its own bodies, so it comes before any body parser.
  mountAuth(app, { db, auth });
  mountRouter(app, router, {
    db,
    auth,
    publicOrigin: new URL(publicUrl).origin,
    bootstrapKey,
    rateLimits: createRateLimiter(publicWriteRateLimit),
  });
  routes?.(app);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

function logRequests(logger: Logger): HttpLogger<Request, Response> {
  return pinoHttp<Request, Response>({
    logger,
    genReqId: () => randomUUID(),
    // Only the request id, method and route are logged. Headers (cookies)
    // and bodies (passwords, keys) are never part of a log line.
    serializers: {
      req: (req) => ({ id: req.id, method: req.method }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
    // The route is known only once Express has matched it, which is after
    // the request has started, so it is read when the response finishes.
    // pino-http also binds the props when the request starts; the route is
    // left out then, so the key appears once in each line. The signed-in
    // person's id is known once the request pipeline has read the session.
    customProps: (req, res) =>
      res.writableFinished
        ? {
            route: req.route?.path ?? null,
            userId: (res.locals.userId as string | undefined) ?? null,
          }
        : {},
    customAttributeKeys: { responseTime: "duration" },
  });
}

const exposeRequestId: RequestHandler = (req, res, next) => {
  res.setHeader("X-Request-Id", String(req.id));
  next();
};

function healthCheck(db: Db): RequestHandler {
  return async (req, res) => {
    try {
      await ping(db);
      res.status(200).json({ status: "ok" });
    } catch (error) {
      req.log.error(
        { err: error, requestId: req.id },
        "health check failed: Postgres did not answer",
      );
      res.status(503).json({ status: "unavailable" });
    }
  };
}

/** Serves Better Auth at `/api/auth/*`, behind the access check. */
function mountAuth(app: Express, services: { db: Db; auth: Auth }): void {
  app.all(
    `${authBasePath}/{*path}`,
    authAccessCheck(services),
    toNodeHandler(services.auth),
  );
}
