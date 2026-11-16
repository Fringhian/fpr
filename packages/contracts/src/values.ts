/**
 * `@fpr/contracts/values`: the plain lists and patterns the schemas are built
 * from, with no runtime import, so a client loads them without Zod or oRPC.
 */

/** The span a gain is measured over. */
export const periods = ["1D", "1W", "1M", "3M", "YTD", "all"] as const;

/** How a gain is expressed. */
export const units = ["eur", "percent"] as const;

/** Every role a person can have. */
export const roles = ["admin", "member", "guest", "anonymous"] as const;

/** The admin alone: people, access, and the price service. */
export const adminRoles = ["admin"] as const;

/** The roles that read the admin area: the admin, and anonymous viewers read-only. */
export const adminAreaRoles = ["admin", "anonymous"] as const;

/**
 * The roles that write portfolios and shares: a member their own portfolio,
 * the admin anyone's, and both manual shares and lookups.
 */
export const writerRoles = ["admin", "member"] as const;

/**
 * The roles with a profile: they edit their own and see everyone's pictures.
 * Everyone but anonymous viewers.
 */
export const profileRoles = ["admin", "member", "guest"] as const;

/** The languages FPR is written in. */
export const languages = ["fr", "en"] as const;

/**
 * `gain`: the standings by gain over the period. `balance`: by balance. In the
 * order the web app's switch shows them.
 */
export const leaderboardBoards = ["gain", "balance"] as const;

/** `market`: priced by the provider. `manual`: priced by value points members enter. */
export const shareKinds = ["market", "manual"] as const;

/**
 * Where a price comes from: a daily close, the 30-minute refresh, or a value
 * point a member entered.
 */
export const priceSources = ["close", "intraday", "manual"] as const;

/** How long a password is, in characters. */
export const passwordLength = { min: 12, max: 128 } as const;

/** The longest display name, in characters. */
export const displayNameMaxLength = 40;

/** How many colours there are: a person's colour is 1 to `colorCount`. */
export const colorCount = 10;

/** An access key: 32 random bytes in base64url, the end of `/access/<key>`. */
export const accessKeyPattern = /^[A-Za-z0-9_-]{43}$/;

/** A row's id: a UUID of versions 1 to 8, as Postgres generates them. */
export const idPattern =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/;

/** The longest text a shares search takes, in characters. */
export const shareSearchMaxLength = 100;

/** The largest picture `PUT /me/avatar` takes: 2 MB. */
export const avatarMaxBytes = 2 * 1024 * 1024;

/** The picture formats `PUT /me/avatar` stores. */
export const avatarMediaTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

/**
 * What an access key is now:
 * - `waiting`: never used, before its first-use deadline;
 * - `claimed`: used, and giving access;
 * - `expired`: never used, past its first-use deadline;
 * - `replaced`: revoked by a newer link for the same person;
 * - `revoked`: revoked by the admin;
 * - `ended`: past the person's access end date;
 * - `unknown`: no such key.
 */
export const accessKeyStates = [
  "waiting",
  "claimed",
  "expired",
  "replaced",
  "revoked",
  "ended",
  "unknown",
] as const;

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

/**
 * A plain decimal: an optional minus sign, digits with no leading zero, and an
 * optional fractional part. No plus sign, exponent, separator, whitespace, or
 * negative zero. Trailing zeros are kept, as Postgres `numeric` returns them.
 */
export const decimalPattern = /^(?!-0(?:\.0+)?$)-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
