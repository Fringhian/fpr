import { z } from "zod";
import { errorMap, errorWithDetails, signedInRoute } from "../../contract.js";
import { periodSchema } from "../../period.js";
import { roles, writerRoles } from "../../roles.js";
import { personSchema } from "../../schemas/person.js";
import {
  isinSchema,
  isinTakenDetailsSchema,
  lookupQuerySchema,
  lookupResultSchema,
  pricePointSchema,
} from "../../schemas/share.js";
import { shareQuoteSchema } from "./schemas.js";

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
 * returned without an ISIN: the API forwards it to the price service's
 * `POST /shares/market`, which stores the listing under the ISIN the member
 * typed, and answers it in `shares`.
 */
export const shareLookupBodySchema = z.object({
  query: lookupQuerySchema,
  isin: isinSchema.optional(),
});

export type ShareLookupBody = z.infer<typeof shareLookupBodySchema>;

/**
 * Refused with `not_found` when the provider no longer returns the symbol of
 * a listing sent with `isin`, and with `isin_taken` when another share has
 * that ISIN.
 */
export const lookUpShares = signedInRoute(writerRoles)
  .route({
    method: "POST",
    path: "/shares/lookup",
    summary: "Look up a share at the price provider",
  })
  .input(shareLookupBodySchema)
  .output(lookupResultSchema)
  .errors(
    errorMap(
      "invalid_request",
      "forbidden",
      "not_found",
      "call_budget_used",
      "provider_unavailable",
    ),
  )
  .errors(errorWithDetails("isin_taken", isinTakenDetailsSchema));
