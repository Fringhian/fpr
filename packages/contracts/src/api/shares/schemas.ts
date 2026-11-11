import { z } from "zod";
import { euro, quantity } from "../../anonymize.js";
import { decimalSchema } from "../../decimal.js";
import { idSchema } from "../../schemas/ids.js";
import { latestPriceSchema, shareSummarySchema } from "../../schemas/share.js";

/**
 * A share with its latest price and its price change over the period. Share
 * prices are market data, so the anonymizer keeps them.
 */
export const shareQuoteSchema = shareSummarySchema.extend({
  /** `null` while the share has no price yet. */
  latestPrice: latestPriceSchema.nullable(),
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

/** A share's id, as a path param. */
export const shareIdParamsSchema = z.object({ id: idSchema });
