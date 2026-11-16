import {
  type ErrorBody,
  type ErrorCode,
  errorStatus,
  type InvalidRequestDetails,
} from "@fpr/contracts";
import { ORPCError } from "@orpc/server";
import type { ErrorRequestHandler, Request, RequestHandler } from "express";

/**
 * An error a contract route answers on purpose, sent with its code's
 * status.
 */
export function apiError(
  code: ErrorCode,
  details?: Record<string, unknown>,
): ORPCError<ErrorCode, Record<string, unknown> | undefined> {
  return new ORPCError(code, { status: errorStatus[code], data: details });
}

/** An error an Express route answers on purpose, with its contract code. */
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

/**
 * Logs a refusal with a declared code, an ordinary answer, at `info`: its
 * code and, for `invalid_request`, its issue paths, never the values sent.
 */
export function logRefusal(req: Request, answer: ErrorBody["error"]): void {
  const issues =
    answer.code === "invalid_request"
      ? (answer.details as InvalidRequestDetails | undefined)?.issues?.map(
          ({ path }) => path,
        )
      : undefined;
  req.log.info(
    { requestId: req.id, code: answer.code, issues },
    "request refused",
  );
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
    logRefusal(req, body.error);
    res.status(errorStatus[error.code]).json(body);
    return;
  }

  req.log.error({ err: error, requestId: req.id }, "unexpected error");
  const body: ErrorBody = { error: { code: "internal_error" } };
  res.status(errorStatus.internal_error).json(body);
};
