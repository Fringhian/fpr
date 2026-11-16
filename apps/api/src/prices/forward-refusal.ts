import { type ErrorCode, errorCodes } from "@fpr/contracts";
import type { AnyContractProcedure } from "@orpc/contract";
import { ORPCError } from "@orpc/server";
import type { Logger } from "pino";
import { apiError } from "../errors.js";

/**
 * Codes about the API itself as the price service's caller: a wrong token,
 * or a failure of the price service. Never something the person can act on.
 */
const callerCodes: readonly ErrorCode[] = [
  "internal_error",
  "unauthenticated",
  "access_ended",
  "forbidden",
  "rate_limited",
];

function priceServiceCode(error: unknown): ErrorCode | undefined {
  return error instanceof ORPCError &&
    (errorCodes as readonly string[]).includes(error.code)
    ? (error.code as ErrorCode)
    : undefined;
}

/**
 * Turns a failed price service call into the answer of the API route that
 * forwarded it, as a `.catch()` handler:
 *
 * - a refusal whose code the route declares, such as `isin_taken` or
 *   `call_budget_used`, is answered with that code and its details. The
 *   price service checks the same schemas, so its `invalid_request` is about
 *   what the person sent, such as a share with no price made manual without
 *   one;
 * - a timeout, an unreachable price service, or an answer in no known format
 *   is `provider_unavailable` when the route declares it, and is logged;
 * - anything else, a wrong token included, stays an unexpected failure:
 *   `internal_error`, logged with its stack.
 */
export function forwardRefusal(
  route: AnyContractProcedure,
  logger: Logger,
): (error: unknown) => never {
  const declared = Object.keys(route["~orpc"].errorMap);
  return (error) => {
    const code = priceServiceCode(error);
    if (
      code !== undefined &&
      declared.includes(code) &&
      !callerCodes.includes(code)
    ) {
      const { data } = error as ORPCError<string, unknown>;
      throw apiError(code, data as Record<string, unknown> | undefined);
    }
    if (code === undefined && declared.includes("provider_unavailable")) {
      logger.error({ err: error }, "price service unreachable");
      throw apiError("provider_unavailable");
    }
    // Wrapped, so the price service's code never reaches the person: its
    // `unauthenticated` would read as their own session ending.
    throw new Error(`price service call failed: ${code ?? "no answer"}`, {
      cause: error,
    });
  };
}
