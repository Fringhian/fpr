import { z } from "zod";

/** Every code an error response can carry. */
export const errorCodes = [
  "invalid_request",
  "unauthenticated",
  "access_ended",
  "forbidden",
  "not_found",
  "admin_exists",
  "color_taken",
  "email_taken",
  "isin_taken",
  "share_in_use",
  "share_not_needing_attention",
  "value_changed",
  "refresh_running",
  "avatar_too_large",
  "avatar_type_unsupported",
  "invalid_access_key",
  "invalid_reset_key",
  "invalid_bootstrap_key",
  "holding_below_zero",
  "future_moment",
  "last_admin",
  "has_portfolio_entries",
  "anonymous_role_fixed",
  "last_value_point",
  "rate_limited",
  "call_budget_used",
  "internal_error",
  "provider_unavailable",
] as const;

export const errorCodeSchema = z.enum(errorCodes);

export type ErrorCode = z.infer<typeof errorCodeSchema>;

export type ErrorStatus =
  | 400
  | 401
  | 403
  | 404
  | 409
  | 413
  | 415
  | 422
  | 429
  | 500
  | 503;

/** The HTTP status each error code is sent with. */
export const errorStatus = {
  invalid_request: 400,
  unauthenticated: 401,
  access_ended: 401,
  forbidden: 403,
  not_found: 404,
  admin_exists: 409,
  color_taken: 409,
  email_taken: 409,
  isin_taken: 409,
  share_in_use: 409,
  share_not_needing_attention: 409,
  value_changed: 409,
  refresh_running: 409,
  avatar_too_large: 413,
  avatar_type_unsupported: 415,
  invalid_access_key: 422,
  invalid_reset_key: 422,
  invalid_bootstrap_key: 422,
  holding_below_zero: 422,
  future_moment: 422,
  last_admin: 422,
  has_portfolio_entries: 422,
  anonymous_role_fixed: 422,
  last_value_point: 422,
  rate_limited: 429,
  call_budget_used: 429,
  internal_error: 500,
  provider_unavailable: 503,
} as const satisfies Record<ErrorCode, ErrorStatus>;

/** Every error response body: `{ error: { code, details } }`. */
export const errorSchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    details: z.record(z.string(), z.unknown()).optional(),
  }),
});

export type ErrorBody = z.infer<typeof errorSchema>;
