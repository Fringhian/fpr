import { type ErrorBody, type ErrorCode, errorStatus } from "@fpr/contracts";
import type { ErrorRequestHandler, RequestHandler } from "express";

/** An error the API answers on purpose, with its contract code. */
export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly details: Record<string, unknown> | undefined;

  constructor(code: ErrorCode, details?: Record<string, unknown>) {
    super(code);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

/** Answers every unknown route with `not_found`. */
export const notFound: RequestHandler = (_req, _res, next) => {
  next(new ApiError("not_found"));
};

/**
 * Turns an error into `{ error: { code, details } }`. Expected errors are
 * answered as they are. Anything else is logged with its stack and the
 * request id, then answered as `internal_error`, without its message.
 */
export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ApiError) {
    const body: ErrorBody = {
      error:
        error.details === undefined
          ? { code: error.code }
          : { code: error.code, details: error.details },
    };
    req.log.error({ err: error, requestId: req.id }, "request failed");
    res.status(errorStatus[error.code]).json(body);
    return;
  }

  req.log.error({ err: error, requestId: req.id }, "unexpected error");
  const body: ErrorBody = { error: { code: "internal_error" } };
  res.status(errorStatus.internal_error).json(body);
};
