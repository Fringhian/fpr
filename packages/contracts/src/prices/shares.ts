import { z } from "zod";
import { errorMap } from "../contract.js";
import { idSchema } from "../schemas/ids.js";
import { isinSchema, shareSummarySchema } from "../schemas/share.js";
import { dateSchema, timestampSchema } from "../schemas/time.js";
import { internalRoute } from "./base.js";
import {
  pricesHistorySchema,
  pricesLookupResultSchema,
  pricesPriceEurSchema,
  pricesShareNameSchema,
  pricesSymbolSchema,
} from "./schemas.js";

/** A lookup: an ISIN or a ticker. */
export const pricesLookupBodySchema = z.object({
  query: z.string().trim().min(1).max(100),
});

export type PricesLookupBody = z.infer<typeof pricesLookupBodySchema>;

export const pricesLookup = internalRoute
  .route({
    method: "POST",
    path: "/lookup",
    summary: "Look up a share at the provider and store its listing",
  })
  .input(pricesLookupBodySchema)
  .output(pricesLookupResultSchema)
  .errors(
    errorMap("invalid_request", "call_budget_used", "provider_unavailable"),
  );

/** A listing a lookup returned without an ISIN, with the ISIN the member typed. */
export const pricesCreateMarketBodySchema = z.object({
  symbol: pricesSymbolSchema,
  isin: isinSchema,
});

export type PricesCreateMarketBody = z.infer<
  typeof pricesCreateMarketBodySchema
>;

export const pricesCreateMarket = internalRoute
  .route({
    method: "POST",
    path: "/shares/market",
    summary: "Store a listing the provider returned without an ISIN",
    successStatus: 201,
  })
  .input(pricesCreateMarketBodySchema)
  .output(shareSummarySchema)
  .errors(
    errorMap(
      "invalid_request",
      "not_found",
      "isin_taken",
      "call_budget_used",
      "provider_unavailable",
    ),
  );

/** A manual share with its first value point. */
export const pricesCreateManualBodySchema = z.object({
  isin: isinSchema,
  name: pricesShareNameSchema,
  priceEur: pricesPriceEurSchema,
  at: timestampSchema,
  /** The member creating it, who also enters the first value point. */
  createdBy: idSchema,
});

export type PricesCreateManualBody = z.infer<
  typeof pricesCreateManualBodySchema
>;

export const pricesCreateManual = internalRoute
  .route({
    method: "POST",
    path: "/shares/manual",
    summary: "Create a manual share with its first value point",
    successStatus: 201,
  })
  .input(pricesCreateManualBodySchema)
  .output(shareSummarySchema)
  .errors(errorMap("invalid_request", "isin_taken", "future_moment"));

/** A manual share's new name, ISIN, or both. */
export const pricesUpdateShareInputSchema = z
  .object({
    id: idSchema,
    name: pricesShareNameSchema.optional(),
    isin: isinSchema.optional(),
  })
  .refine((input) => input.name !== undefined || input.isin !== undefined, {
    error: "Expected a name or an ISIN",
  });

export type PricesUpdateShareInput = z.infer<
  typeof pricesUpdateShareInputSchema
>;

export const pricesUpdateShare = internalRoute
  .route({
    method: "PATCH",
    path: "/shares/{id}",
    summary: "Edit a manual share's name or ISIN",
  })
  .input(pricesUpdateShareInputSchema)
  .output(shareSummarySchema)
  .errors(errorMap("invalid_request", "not_found", "isin_taken"));

/** The day from which a share's closes must be stored. */
export const pricesFillHistoryInputSchema = z.object({
  id: idSchema,
  from: dateSchema,
});

export type PricesFillHistoryInput = z.infer<
  typeof pricesFillHistoryInputSchema
>;

export const pricesFillHistory = internalRoute
  .route({
    method: "POST",
    path: "/shares/{id}/history",
    summary: "Store a share's missing closes from a day",
  })
  .input(pricesFillHistoryInputSchema)
  .output(pricesHistorySchema)
  .errors(
    errorMap(
      "invalid_request",
      "not_found",
      "call_budget_used",
      "provider_unavailable",
    ),
  );

export const pricesDeleteShareInputSchema = z.object({ id: idSchema });

export type PricesDeleteShareInput = z.infer<
  typeof pricesDeleteShareInputSchema
>;

export const pricesDeleteShare = internalRoute
  .route({
    method: "DELETE",
    path: "/shares/{id}",
    summary: "Delete a share no share change refers to",
  })
  .input(pricesDeleteShareInputSchema)
  .output(z.void())
  .errors(errorMap("invalid_request", "not_found", "share_in_use"));

/**
 * Who turns a market share manual, and its first value point when it has no
 * price: `priceEur` and `at` together, or neither.
 */
export const pricesMakeManualInputSchema = z
  .object({
    id: idSchema,
    /** The admin, who enters the share's first manual value point. */
    enteredBy: idSchema,
    priceEur: pricesPriceEurSchema.optional(),
    at: timestampSchema.optional(),
  })
  .refine(
    (input) => (input.priceEur === undefined) === (input.at === undefined),
    { error: "Expected priceEur and at together" },
  );

export type PricesMakeManualInput = z.infer<typeof pricesMakeManualInputSchema>;

export const pricesMakeManual = internalRoute
  .route({
    method: "POST",
    path: "/shares/{id}/make-manual",
    summary: "Turn a market share that needs attention into a manual share",
  })
  .input(pricesMakeManualInputSchema)
  .output(shareSummarySchema)
  .errors(
    errorMap(
      "invalid_request",
      "not_found",
      "share_not_needing_attention",
      "future_moment",
    ),
  );
