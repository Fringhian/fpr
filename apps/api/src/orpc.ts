import { type ErrorBody, type ErrorCode, errorCodes } from "@fpr/contracts";
import { OpenAPIHandler } from "@orpc/openapi/node";
import { type AnyRouter, ORPCError, onError } from "@orpc/server";
import type { Express, Request } from "express";

/** What every handler receives. */
export interface ApiContext {
  req: Request;
}

function isErrorCode(code: string): code is ErrorCode {
  return (errorCodes as readonly string[]).includes(code);
}

/**
 * FPR's error body for an oRPC error: a declared code as it is, oRPC's input
 * validation failure as `invalid_request` with its issues, and anything else
 * as `internal_error`, without its message.
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
    return { error: { code: "invalid_request", details: { issues } } };
  }
  return { error: { code: "internal_error" } };
}

/**
 * Mounts an oRPC router under `/api`. A request no route matches goes on to
 * the next Express handler, so the not-found answer stays Express's.
 */
export function mountRouter(app: Express, router: AnyRouter): void {
  const handler = new OpenAPIHandler<ApiContext>(router, {
    // The status stays the error's own: a declared code carries FPR's, input
    // validation is 400, and an unexpected failure 500.
    customErrorResponseBodyEncoder: toErrorBody,
    clientInterceptors: [
      onError((error, { context }) => {
        const expected = error instanceof ORPCError && isErrorCode(error.code);
        context.req.log.error(
          { err: error, requestId: context.req.id },
          expected ? "request failed" : "unexpected error",
        );
      }),
    ],
  });

  app.use("/api", async (req, res, next) => {
    const { matched } = await handler.handle(req, res, {
      prefix: "/api",
      context: { req },
    });
    if (!matched) {
      next();
    }
  });
}
