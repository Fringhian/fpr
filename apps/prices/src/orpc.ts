import {
  type ErrorBody,
  type ErrorCode,
  errorCodes,
  type InvalidRequestDetails,
  validationIssueCodeSchema,
} from "@fpr/contracts";
import { pricesContract } from "@fpr/contracts/prices";
import type { Db } from "@fpr/db";
import { OpenAPIHandler } from "@orpc/openapi/node";
import { type AnyRouter, implement, ORPCError, onError } from "@orpc/server";
import type { Express, Request } from "express";

/** What every handler receives. */
export interface PricesContext {
  req: Request;
  db: Db;
  /** `RACE_TIMEZONE`: where days start, and the schedules' time zone. */
  timeZone: string;
  /** The current moment. Tests replace it. */
  now: () => Date;
}

/**
 * The base every handler of `pricesContract` is built from, such as
 * `service.createManual.handler(…)`.
 */
export const service = implement(pricesContract).$context<PricesContext>();

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
function toErrorBody(error: ORPCError<string, unknown>): ErrorBody {
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
 * Mounts the oRPC router of `pricesContract` at the root. A request no route
 * matches goes on to the next Express handler, so the not-found answer stays
 * Express's.
 */
export function mountRouter(
  app: Express,
  router: AnyRouter,
  context: Omit<PricesContext, "req">,
): void {
  const handler = new OpenAPIHandler<PricesContext>(router, {
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

  app.use(async (req, res, next) => {
    const { matched } = await handler.handle(req, res, {
      context: { ...context, req },
    });
    if (!matched) {
      next();
    }
  });
}
