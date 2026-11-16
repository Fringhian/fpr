/**
 * `@fpr/contracts/values`: the plain lists the schemas are built from, with
 * no runtime import, so a client loads them without Zod or oRPC.
 */

/** The span a gain is measured over. */
export const periods = ["1D", "1W", "1M", "3M", "YTD", "all"] as const;

/** How a gain is expressed. */
export const units = ["eur", "percent"] as const;
