import { z } from "zod";
import { idSchema } from "../../schemas/ids.js";
import { priceChangeSchema } from "../../schemas/performance.js";
import { latestPriceSchema, shareSummarySchema } from "../../schemas/share.js";

/**
 * A share with its latest price and its price change over the period. Share
 * prices are market data, so the anonymizer keeps them.
 */
export const shareQuoteSchema = shareSummarySchema.extend({
  /** `null` while the share has no price yet. */
  latestPrice: latestPriceSchema.nullable(),
  /** The change of one unit's price over the period, or `null` without a price at its start. */
  change: priceChangeSchema.nullable(),
});

export type ShareQuote = z.infer<typeof shareQuoteSchema>;

/** A share's id, as a path param. */
export const shareIdParamsSchema = z.object({ id: idSchema });
