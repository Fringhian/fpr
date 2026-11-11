import { randomUUID } from "node:crypto";
import { type Db, ping } from "@fpr/db";
import type { AnyRouter } from "@orpc/server";
import express, { type Express } from "express";
import type { Logger } from "pino";
import { pinoHttp } from "pino-http";
import { docsPath, docsRouter } from "./docs.js";
import { errorHandler, notFound } from "./errors.js";
import { mountRouter } from "./orpc.js";
import { apiRouter } from "./router.js";

export interface AppOptions {
  /** The contract routes served under `/api`. Defaults to every API route. */
  router?: AnyRouter;
  db: Db;
  logger: Logger;
  /** Serves the OpenAPI document and its viewer at `/api/docs`. */
  docs?: boolean;
  /** Mounts more routes before the not-found and error handlers. */
  routes?: (app: Express) => void;
}

/**
 * Builds the Express app: request logging, health, the docs when asked, and
 * error handling.
 */
export function createApp({
  db,
  logger,
  docs = false,
  router = apiRouter,
  routes,
}: AppOptions): Express {
  const app = express();

  // `web` is the one proxy in front of the API, so the address it forwards in
  // X-Forwarded-For is the client's. The value 1 trusts that single hop and
  // nothing beyond it.
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(
    pinoHttp({
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
      customProps: (req) => ({ route: req.route?.path ?? null }),
      customAttributeKeys: { responseTime: "duration" },
    }),
  );
  app.use((req, res, next) => {
    res.setHeader("X-Request-Id", String(req.id));
    next();
  });

  app.get("/health", async (req, res) => {
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
  });

  if (docs) {
    app.use(docsPath, docsRouter());
  }

  mountRouter(app, router);
  routes?.(app);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
