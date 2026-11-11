import { z } from "zod";
import { errorMap, signedInRoute } from "../../contract.js";
import { periodSchema } from "../../period.js";
import { roles } from "../../roles.js";
import { personSchema } from "../../schemas/person.js";
import {
  isinSchema,
  pricePointSchema,
  shareSummarySchema,
} from "../../schemas/share.js";
import { shareCurrencySchema, shareQuoteSchema } from "./schemas.js";

/** `GET /shares`: a name, ISIN, or symbol to filter by, and the period. */
export const shareSearchQuerySchema = z.object({
  /** Empty lists every stored share. */
  q: z.string().trim().max(100).default(""),
  period: periodSchema,
});

export type ShareSearchQuery = z.input<typeof shareSearchQuerySchema>;

/** A stored share in the Shares list. */
export const shareListItemSchema = shareQuoteSchema.extend({
  /** The share's prices over the period, for a small chart. */
  series: z.array(pricePointSchema),
  /** The members holding it now. */
  holders: z.array(personSchema),
});

export type ShareListItem = z.infer<typeof shareListItemSchema>;

/** The stored shares matching the filter: held ones first, most holders first. */
export const shareListSchema = z.object({
  shares: z.array(shareListItemSchema),
});

export type ShareList = z.infer<typeof shareListSchema>;

export const searchShares = signedInRoute(roles)
  .route({
    method: "GET",
    path: "/shares",
    summary: "Filter the stored shares",
  })
  .input(shareSearchQuerySchema)
  .output(shareListSchema)
  .errors(errorMap("invalid_request"));

/**
 * `POST /shares/lookup`: an ISIN, a ticker, or any text to look up at the
 * provider. With `isin`, `query` is the symbol of a listing the provider
 * returned without an ISIN, and the listing is stored under the ISIN the member
 * typed.
 */
export const shareLookupBodySchema = z.object({
  query: z.string().trim().min(1).max(100),
  isin: isinSchema.optional(),
});

export type ShareLookupBody = z.infer<typeof shareLookupBodySchema>;

/** A listing the provider returned without an ISIN: not stored until a member types one. */
export const shareListingSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
  exchange: z.string().min(1),
  tradingCurrency: shareCurrencySchema,
});

export type ShareListing = z.infer<typeof shareListingSchema>;

/** What a lookup found: the matching shares, stored, and the listings without an ISIN. */
export const shareLookupResultSchema = z.object({
  shares: z.array(shareSummarySchema),
  listingsWithoutIsin: z.array(shareListingSchema),
});

export type ShareLookupResult = z.infer<typeof shareLookupResultSchema>;

export const lookUpShares = signedInRoute(["admin", "member"])
  .route({
    method: "POST",
    path: "/shares/lookup",
    summary: "Look up a share at the price provider",
  })
  .input(shareLookupBodySchema)
  .output(shareLookupResultSchema)
  .errors(
    errorMap(
      "invalid_request",
      "forbidden",
      "call_budget_used",
      "provider_unavailable",
    ),
  );
