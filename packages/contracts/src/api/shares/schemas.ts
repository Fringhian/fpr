import { z } from "zod";
import { euro, quantity } from "../../anonymize.js";
import { decimalSchema } from "../../decimal.js";
import { idSchema } from "../../schemas/ids.js";
import { pricePointSchema, shareSummarySchema } from "../../schemas/share.js";

/** A share's name as members type it: 1 to 200 characters, trimmed. */
export const shareNameSchema = z.string().trim().min(1).max(200);

/** A currency's code, such as `EUR`, `USD`, or `GBX` for pence. */
export const shareCurrencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/, { error: "Expected a currency code, like EUR" });

export type ShareCurrency = z.infer<typeof shareCurrencySchema>;

/** The value of one unit, in euros: a decimal string above zero. */
export const sharePriceEurSchema = decimalSchema.refine(
  (value) => !value.startsWith("-") && /[1-9]/.test(value),
  { error: "Expected a price above zero" },
);

/**
 * Where a price comes from: a daily close, the 30-minute refresh, or a value
 * point a member entered.
 */
export const sharePriceSources = ["close", "intraday", "manual"] as const;

export const sharePriceSourceSchema = z.enum(sharePriceSources);

export type SharePriceSource = z.infer<typeof sharePriceSourceSchema>;

/**
 * A share's latest price, with its time and source, so a close is shown as the
 * last close and a manual value "as of" its day.
 */
export const shareLatestPriceSchema = pricePointSchema.extend({
  source: sharePriceSourceSchema,
});

export type ShareLatestPrice = z.infer<typeof shareLatestPriceSchema>;

/**
 * A share with its latest price and its price change over the period. Share
 * prices are market data, so the anonymizer keeps them.
 */
export const shareQuoteSchema = shareSummarySchema.extend({
  /** `null` while the share has no price yet. */
  latestPrice: shareLatestPriceSchema.nullable(),
  /** The change of one unit's price over the period, or `null` without a price at its start. */
  changeEur: decimalSchema.nullable(),
  /** The same change in percent, such as `12.5` for 12.5 %. */
  changePercent: decimalSchema.nullable(),
});

export type ShareQuote = z.infer<typeof shareQuoteSchema>;

/**
 * A member's position on a share: the quantity held, its value, and its gain
 * since bought, each purchase valued at the share's price on its day.
 */
export const sharePositionSchema = z.object({
  quantity: quantity(decimalSchema),
  /** `null` while the share has no price yet. */
  valueEur: euro(decimalSchema.nullable()),
  /** The value minus the cost, or `null` while the share has no price yet. */
  gainSinceBoughtEur: euro(decimalSchema.nullable()),
  /** The gain divided by the cost, in percent, such as `12.5` for 12.5 %. */
  gainSinceBoughtPercent: decimalSchema.nullable(),
});

export type SharePosition = z.infer<typeof sharePositionSchema>;

/** The `details` of `isin_taken`: the share that has the ISIN. */
export const shareIsinTakenDetailsSchema = z.object({ shareId: idSchema });

export type ShareIsinTakenDetails = z.infer<typeof shareIsinTakenDetailsSchema>;

/** A share's id, as a path param. */
export const shareIdParamsSchema = z.object({ id: idSchema });
