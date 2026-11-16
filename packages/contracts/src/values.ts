/**
 * `@fpr/contracts/values`: the plain lists and patterns the schemas are built
 * from, with no runtime import, so a client loads them without Zod or oRPC.
 */

/** The span a gain is measured over. */
export const periods = ["1D", "1W", "1M", "3M", "YTD", "all"] as const;

/** How a gain is expressed. */
export const units = ["eur", "percent"] as const;

/** The languages FPR is written in. */
export const languages = ["fr", "en"] as const;

/** `balance`: the standings by balance. `gain`: by gain over the period. */
export const leaderboardBoards = ["balance", "gain"] as const;

/** `market`: priced by the provider. `manual`: priced by value points members enter. */
export const shareKinds = ["market", "manual"] as const;

/**
 * Where a price comes from: a daily close, the 30-minute refresh, or a value
 * point a member entered.
 */
export const priceSources = ["close", "intraday", "manual"] as const;

/**
 * A plain decimal: an optional minus sign, digits with no leading zero, and an
 * optional fractional part. No plus sign, exponent, separator, whitespace, or
 * negative zero. Trailing zeros are kept, as Postgres `numeric` returns them.
 */
export const decimalPattern = /^(?!-0(?:\.0+)?$)-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
