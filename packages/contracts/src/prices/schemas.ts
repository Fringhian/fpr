import { z } from "zod";
import { decimalSchema } from "../decimal.js";
import { idSchema } from "../schemas/ids.js";
import { pricePointSchema, shareSummarySchema } from "../schemas/share.js";
import { dateSchema } from "../schemas/time.js";

/** A price in euros: a decimal string, zero or more. */
export const pricesPriceEurSchema = decimalSchema.refine(
  (value) => !value.startsWith("-"),
  { error: "Expected a price of zero or more" },
);

/** A manual share's name, as a member types it: 1 to 100 characters. */
export const pricesShareNameSchema = z.string().trim().min(1).max(100);

/** A currency code, such as `EUR`, `USD`, or `GBX` for pence. */
export const pricesCurrencySchema = z
  .string()
  .regex(/^[A-Z]{3}$/, { error: "Expected a currency code, like EUR" });

/** A provider symbol: the listing's code and exchange, such as `ABC.PA`. */
export const pricesSymbolSchema = z.string().trim().min(1).max(40);

/** A listing the provider returned without an ISIN. It isn't stored. */
export const pricesListingSchema = z.object({
  symbol: pricesSymbolSchema,
  name: z.string().min(1),
  exchange: z.string().min(1),
  tradingCurrency: pricesCurrencySchema,
});

export type PricesListing = z.infer<typeof pricesListingSchema>;

/** What a lookup found: the stored shares, and the listings with no ISIN. */
export const pricesLookupResultSchema = z.object({
  shares: z.array(shareSummarySchema),
  listings: z.array(pricesListingSchema),
});

export type PricesLookupResult = z.infer<typeof pricesLookupResultSchema>;

/** A manual share's value point, with the member who last entered it. */
export const pricesValuePointSchema = pricePointSchema.extend({
  /** `null` once that member is deleted. */
  enteredBy: idSchema.nullable(),
});

export type PricesValuePoint = z.infer<typeof pricesValuePointSchema>;

/** A share's history once its closes are stored. */
export const pricesHistorySchema = z.object({
  /** The provider's earliest close, when it starts after a holding: see `prices.md` › History. */
  historyStartsOn: dateSchema.nullable(),
});

export type PricesHistory = z.infer<typeof pricesHistorySchema>;
