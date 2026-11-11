import { z } from "zod";
import { errorMap, errorWithDetails } from "../contract.js";
import { idSchema } from "../schemas/ids.js";
import { priceEurSchema } from "../schemas/money.js";
import { valueChangedDetailsSchema } from "../schemas/share.js";
import { timestampSchema } from "../schemas/time.js";
import { internalRoute } from "./base.js";
import { pricesValuePointSchema } from "./schemas.js";

/** `value_changed`, with the value point's stored price in `details`. */
const valueChangedError = errorWithDetails(
  "value_changed",
  valueChangedDetailsSchema,
);

/**
 * A value point's path params. `at` is its moment, with its offset, as one
 * percent-encoded path segment: `2026-03-02T05%3A10%3A00%2B01%3A00`. oRPC's
 * client encodes it and its server decodes it. Any offset names the same
 * moment, so `2026-03-02T04:10:00Z` finds the same value point.
 */
const valuePointParams = {
  id: idSchema,
  at: timestampSchema,
};

/** A new value point, entered by a member. */
export const pricesAddManualPriceInputSchema = z.object({
  id: idSchema,
  at: timestampSchema,
  priceEur: priceEurSchema,
  enteredBy: idSchema,
});

export type PricesAddManualPriceInput = z.infer<
  typeof pricesAddManualPriceInputSchema
>;

export const pricesAddManualPrice = internalRoute
  .route({
    method: "POST",
    path: "/shares/{id}/manual-prices",
    summary: "Store a value point for a manual share",
    successStatus: 201,
  })
  .input(pricesAddManualPriceInputSchema)
  .output(pricesValuePointSchema)
  .errors(errorMap("invalid_request", "not_found", "future_moment"))
  .errors(valueChangedError);

/** A value point's new price, and the price the member saw before editing. */
export const pricesUpdateManualPriceInputSchema = z.object({
  ...valuePointParams,
  priceEur: priceEurSchema,
  expectedPriceEur: priceEurSchema,
  enteredBy: idSchema,
});

export type PricesUpdateManualPriceInput = z.infer<
  typeof pricesUpdateManualPriceInputSchema
>;

export const pricesUpdateManualPrice = internalRoute
  .route({
    method: "PATCH",
    path: "/shares/{id}/manual-prices/{at}",
    summary: "Edit a value point's price",
  })
  .input(pricesUpdateManualPriceInputSchema)
  .output(pricesValuePointSchema)
  .errors(errorMap("invalid_request", "not_found"))
  .errors(valueChangedError);

/** A value point to delete, the price the member saw, and who deletes it. */
export const pricesDeleteManualPriceInputSchema = z.object({
  ...valuePointParams,
  expectedPriceEur: priceEurSchema,
  deletedBy: idSchema,
});

export type PricesDeleteManualPriceInput = z.infer<
  typeof pricesDeleteManualPriceInputSchema
>;

export const pricesDeleteManualPrice = internalRoute
  .route({
    method: "DELETE",
    path: "/shares/{id}/manual-prices/{at}",
    summary: "Delete a value point",
  })
  .input(pricesDeleteManualPriceInputSchema)
  .output(z.void())
  .errors(errorMap("invalid_request", "not_found", "last_value_point"))
  .errors(valueChangedError);
