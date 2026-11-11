import { z } from "zod";
import { quantity } from "../../anonymize.js";
import { errorMap, signedInRoute } from "../../contract.js";
import { decimalSchema } from "../../decimal.js";
import { errorStatus } from "../../errors.js";
import { idSchema } from "../../schemas/ids.js";
import { shareSummarySchema } from "../../schemas/share.js";
import { timestampSchema } from "../../schemas/time.js";

/** The roles that write a portfolio: a member their own, the admin anyone's. */
export const portfolioWriterRoles = ["admin", "member"] as const;

/** Shares added, above zero, or removed, below zero: never zero. */
export const portfolioQuantityDeltaSchema = decimalSchema.refine(
  (delta) => !/^0(?:\.0+)?$/.test(delta),
  { error: "Expected a quantity other than zero" },
);

/** A share change: "+3 of this share" or "−2 of that one". */
export const portfolioChangeSchema = z.object({
  type: z.literal("change"),
  id: idSchema,
  share: shareSummarySchema,
  quantityDelta: quantity(portfolioQuantityDeltaSchema),
  effectiveAt: timestampSchema,
});

export type PortfolioChange = z.infer<typeof portfolioChangeSchema>;

/**
 * The `details` of `holding_below_zero`: the entry the write would break, and
 * what the holding would be just before it.
 */
export const portfolioHoldingBelowZeroDetailsSchema = z.object({
  /** The stored share change the holding would go below zero at, or `null` when it is the change sent. */
  change: portfolioChangeSchema.nullable(),
  /** The quantity held just before that change, with the write applied. */
  held: quantity(decimalSchema),
});

export type PortfolioHoldingBelowZeroDetails = z.infer<
  typeof portfolioHoldingBelowZeroDetailsSchema
>;

/** `holding_below_zero`, with the entry it would break in `details`. */
const holdingBelowZeroError = {
  holding_below_zero: {
    status: errorStatus.holding_below_zero,
    data: portfolioHoldingBelowZeroDetailsSchema,
  },
};

export const addPortfolioChange = signedInRoute(portfolioWriterRoles)
  .route({
    method: "POST",
    path: "/users/{userId}/changes",
    summary: "Add or remove shares",
    successStatus: 201,
  })
  .input(
    z.object({
      userId: idSchema,
      shareId: idSchema,
      quantityDelta: portfolioQuantityDeltaSchema,
      effectiveAt: timestampSchema,
    }),
  )
  .output(portfolioChangeSchema)
  .errors(
    errorMap("invalid_request", "forbidden", "not_found", "future_moment"),
  )
  .errors(holdingBelowZeroError);

export const updatePortfolioChange = signedInRoute(portfolioWriterRoles)
  .route({
    method: "PATCH",
    path: "/changes/{id}",
    summary: "Edit a share change",
  })
  .input(
    z
      .object({
        id: idSchema,
        quantityDelta: portfolioQuantityDeltaSchema.optional(),
        effectiveAt: timestampSchema.optional(),
      })
      .refine(
        (body) =>
          body.quantityDelta !== undefined || body.effectiveAt !== undefined,
        { error: "Expected a quantityDelta or an effectiveAt" },
      ),
  )
  .output(portfolioChangeSchema)
  .errors(
    errorMap("invalid_request", "forbidden", "not_found", "future_moment"),
  )
  .errors(holdingBelowZeroError);

export const deletePortfolioChange = signedInRoute(portfolioWriterRoles)
  .route({
    method: "DELETE",
    path: "/changes/{id}",
    summary: "Delete a share change",
    successStatus: 204,
  })
  .input(z.object({ id: idSchema }))
  .output(z.void())
  .errors(errorMap("invalid_request", "forbidden", "not_found"))
  .errors(holdingBelowZeroError);
