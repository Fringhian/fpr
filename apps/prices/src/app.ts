import { randomUUID } from "node:crypto";
import { type ErrorBody, errorStatus } from "@fpr/contracts";
import { type Db, ping } from "@fpr/db";
import express, {
  type ErrorRequestHandler,
  type Express,
  type Request,
  type RequestHandler,
  type Response,
} from "express";
import type { Logger } from "pino";
import { type HttpLogger, pinoHttp } from "pino-http";
import { requireToken } from "./auth.js";
import { mountRouter } from "./orpc.js";
import type { Pricing } from "./pricing/pricing.js";
import { pricesRouter } from "./router.js";

export interface AppOptions {
  logger: Logger;
  /** The bearer token every route except `/health` requires. */
  token: string;
  /** Its pool, time zone, and clock serve every route. */
  pricing: Pricing;
}

/**
 * Builds the Express app: request logging, the unauthenticated health check,
 * token authentication for every other route, the `pricesContract` routes,
 * and error handling.
 */
export function createApp({ logger, token, pricing }: AppOptions): Express {
  const { db, timeZone, now } = pricing.deps;
  const app = express();

  app.disable("x-powered-by");

  app.use(logRequests(logger));
  app.use(exposeRequestId);

  app.get("/health", healthCheck(db));

  // Every route mounted after this point requires the bearer token.
  app.use(requireToken(token));

  mountRouter(app, pricesRouter, { db, timeZone, now, pricing });

  app.use(notFound);
  app.use(errorHandler);

  return app;
}

function logRequests(logger: Logger): HttpLogger<Request, Response> {
  return pinoHttp<Request, Response>({
    logger,
    genReqId: () => randomUUID(),
    // Only the request id, method and route are logged. Headers and bodies
    // (the bearer token, passwords) are never part of a log line.
    serializers: {
      req: (req) => ({ id: req.id, method: req.method }),
      res: (res) => ({ statusCode: res.statusCode }),
    },
    // pino-http also calls this before the route is matched; the key is left
    // out then, so it appears once in each line.
    customProps: (req, res) =>
      res.writableFinished ? { route: req.route?.path ?? null } : {},
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

const notFound: RequestHandler = (_req, res) => {
  const body: ErrorBody = { error: { code: "not_found" } };
  res.status(errorStatus.not_found).json(body);
};

const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }
  req.log.error({ err: error, requestId: req.id }, "unexpected error");
  const body: ErrorBody = { error: { code: "internal_error" } };
  res.status(errorStatus.internal_error).json(body);
};
