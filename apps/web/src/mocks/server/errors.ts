import {
  type ErrorBody,
  type ErrorCode,
  errorCodes,
  errorStatus,
  validationIssueCodeSchema,
} from "@fpr/contracts";
import { ORPCError } from "@orpc/server";

/** An error a mock route answers on purpose, with its code's status, as the API does. */
export function mockError(
  code: ErrorCode,
  details?: Record<string, unknown>,
): ORPCError<ErrorCode, Record<string, unknown> | undefined> {
  return new ORPCError(code, { status: errorStatus[code], data: details });
}

function isErrorCode(code: string): code is ErrorCode {
  return (errorCodes as readonly string[]).includes(code);
}

function issuesOf(data: unknown) {
  const { issues } = (data ?? {}) as { issues?: unknown };
  return (
    Array.isArray(issues)
      ? (issues as { path?: PropertyKey[]; code?: string }[])
      : []
  ).map(({ path = [], code }) => ({
    path: path.flatMap((key) =>
      typeof key === "symbol" ? [] : [key as string | number],
    ),
    code: validationIssueCodeSchema.catch("custom").parse(code),
  }));
}

/**
 * FPR's error body for an oRPC error, as the API writes it: a declared code
 * as it is, an input validation failure as `invalid_request` with each
 * issue's path and code, and anything else as `internal_error`.
 */
export function toErrorBody(error: ORPCError<string, unknown>): ErrorBody {
  if (isErrorCode(error.code)) {
    const details = error.data as Record<string, unknown> | undefined;
    return {
      error:
        details === undefined
          ? { code: error.code }
          : { code: error.code, details },
    };
  }
  if (error.code === "BAD_REQUEST") {
    return {
      error: {
        code: "invalid_request",
        details: { issues: issuesOf(error.data) },
      },
    };
  }
  return { error: { code: "internal_error" } };
}
