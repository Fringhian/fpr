import { z } from "zod";
import { idSchema } from "./ids.js";
import { currencySchema, priceEurSchema } from "./money.js";
import { timestampSchema } from "./time.js";

/** An ISIN: two letters, nine letters or digits, and a check digit. */
export const isinSchema = z
  .string()
  .regex(/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/, { error: "Expected an ISIN" });

/** `market`: priced by the provider. `manual`: priced by value points members enter. */
export const shareKinds = ["market", "manual"] as const;

export const shareKindSchema = z.enum(shareKinds);

export type ShareKind = z.infer<typeof shareKindSchema>;

/** A share's name as a member types or confirms it: 1 to 100 characters, trimmed. */
export const shareNameSchema = z.string().trim().min(1).max(100);

/** A provider symbol: the listing's code and exchange, such as `ABC.PA`. */
export const symbolSchema = z.string().trim().min(1).max(40);

/** A share as every list shows it. */
export const shareSummarySchema = z.object({
  id: idSchema,
  isin: isinSchema,
  name: z.string().min(1),
  kind: shareKindSchema,
  /** The provider's symbol for the listing FPR prices, or `null` for a manual share. */
  symbol: z.string().nullable(),
});

export type ShareSummary = z.infer<typeof shareSummarySchema>;

/**
 * What one unit of a share was worth at a moment, in euros. Share prices are
 * market data, so the anonymizer keeps them.
 */
export const pricePointSchema = z.object({
  at: timestampSchema,
  priceEur: priceEurSchema,
});

export type PricePoint = z.infer<typeof pricePointSchema>;

/**
 * Where a price comes from: a daily close, the 30-minute refresh, or a value
 * point a member entered.
 */
export const priceSources = ["close", "intraday", "manual"] as const;

export const priceSourceSchema = z.enum(priceSources);

export type PriceSource = z.infer<typeof priceSourceSchema>;

/**
 * A share's latest price, with its time and source, so a close is shown as the
 * last close and a manual value "as of" its day.
 */
export const latestPriceSchema = pricePointSchema.extend({
  source: priceSourceSchema,
});

export type LatestPrice = z.infer<typeof latestPriceSchema>;

/** What a lookup sends to the provider: an ISIN, a ticker, or any text. */
export const lookupQuerySchema = z.string().trim().min(1).max(100);

/** A listing the provider returned without an ISIN: not stored until a member types one. */
export const listingSchema = z.object({
  symbol: symbolSchema,
  name: z.string().min(1),
  exchange: z.string().min(1),
  tradingCurrency: currencySchema,
});

export type Listing = z.infer<typeof listingSchema>;

/** What a lookup found: the matching shares, stored, and the listings without an ISIN. */
export const lookupResultSchema = z.object({
  shares: z.array(shareSummarySchema),
  listings: z.array(listingSchema),
});

export type LookupResult = z.infer<typeof lookupResultSchema>;

/** The `details` of `isin_taken`: the share that has the ISIN. */
export const isinTakenDetailsSchema = z.object({ shareId: idSchema });

export type IsinTakenDetails = z.infer<typeof isinTakenDetailsSchema>;

/**
 * The `details` of `value_changed`: the value point's stored price, which the
 * editor confirms their value over or keeps.
 */
export const valueChangedDetailsSchema = z.object({
  priceEur: priceEurSchema,
});

export type ValueChangedDetails = z.infer<typeof valueChangedDetailsSchema>;
