import type { ErrorCode } from "@fpr/contracts";
import { ORPCError } from "@orpc/client";
import type { ParseKeys } from "i18next";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";

/**
 * The text each error code is written with, in `en.json` and `fr.json`. A
 * code missing here, or a key missing from the texts, fails the type check.
 */
const errorTexts = {
  invalid_request: "errors.invalidRequest",
  unauthenticated: "errors.unauthenticated",
  access_ended: "errors.accessEnded",
  forbidden: "errors.forbidden",
  not_found: "errors.notFound",
  admin_exists: "errors.adminExists",
  color_taken: "errors.colorTaken",
  email_taken: "errors.emailTaken",
  isin_taken: "errors.isinTaken",
  share_in_use: "errors.shareInUse",
  share_not_needing_attention: "errors.shareNotNeedingAttention",
  value_changed: "errors.valueChanged",
  refresh_running: "errors.refreshRunning",
  avatar_too_large: "errors.avatarTooLarge",
  avatar_type_unsupported: "errors.avatarTypeUnsupported",
  invalid_access_key: "errors.invalidAccessKey",
  invalid_reset_key: "errors.invalidResetKey",
  invalid_bootstrap_key: "errors.invalidBootstrapKey",
  holding_below_zero: "errors.holdingBelowZero",
  future_moment: "errors.futureMoment",
  last_admin: "errors.lastAdmin",
  has_portfolio_entries: "errors.hasPortfolioEntries",
  anonymous_role_fixed: "errors.anonymousRoleFixed",
  last_value_point: "errors.lastValuePoint",
  rate_limited: "errors.rateLimited",
  call_budget_used: "errors.callBudgetUsed",
  internal_error: "errors.internalError",
  provider_unavailable: "errors.providerUnavailable",
} as const satisfies Record<ErrorCode, ParseKeys>;

function isErrorCode(code: unknown): code is ErrorCode {
  return typeof code === "string" && Object.hasOwn(errorTexts, code);
}

/**
 * The oRPC error of an FPR error body, `{ error: { code, details } }`, with
 * the response's status and the details as its data. A body that isn't one,
 * such as a proxy's error page, is left to oRPC, which throws an error with no
 * FPR code.
 */
export function decodeErrorBody(
  body: unknown,
  response: { status: number },
): ORPCError<ErrorCode, unknown> | null {
  const error =
    typeof body === "object" && body !== null && "error" in body
      ? body.error
      : undefined;
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }
  if (!isErrorCode(error.code)) {
    return null;
  }
  const details = "details" in error ? error.details : undefined;
  return new ORPCError(error.code, {
    status: response.status,
    data: details,
    defined: true,
  });
}

/** Whether a call failed with this FPR code. */
export function isApiError<const Code extends ErrorCode>(
  error: unknown,
  code: Code,
): error is ORPCError<Code, unknown> {
  return error instanceof ORPCError && error.code === code;
}

/**
 * The text key of any error a call throws: its code's text, the internal
 * error's for an answer with no FPR code, and "can't be reached" when no
 * answer came back.
 */
export function errorTextKey(error: unknown): ParseKeys {
  if (!(error instanceof ORPCError)) {
    return "errors.unreachable";
  }
  return isErrorCode(error.code)
    ? errorTexts[error.code]
    : errorTexts.internal_error;
}

/** Writes any error a call throws in the person's language. */
export function useErrorText(): (error: unknown) => string {
  const { t } = useTranslation();
  return useCallback((error) => t(errorTextKey(error)), [t]);
}

/**
 * A refusal: an answer under 500, which the same request gets again, so it
 * isn't retried.
 */
export function isRefusal(error: unknown): boolean {
  return error instanceof ORPCError && error.status < 500;
}
