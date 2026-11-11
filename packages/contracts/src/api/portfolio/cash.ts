import { z } from "zod";
import { quantity } from "../../anonymize.js";
import { errorMap, signedInRoute } from "../../contract.js";
import { decimalSchema } from "../../decimal.js";
import { idSchema } from "../../schemas/ids.js";
import { timestampSchema } from "../../schemas/time.js";
import { portfolioWriterRoles } from "./changes.js";

/** Cash in euros: zero or more. */
export const portfolioCashAmountSchema = decimalSchema.refine(
  (amount) => !amount.startsWith("-"),
  { error: "Expected an amount of zero or more" },
);

/** A cash balance: "from this moment, I have €30". It holds until the next one. */
export const portfolioCashBalanceSchema = z.object({
  type: z.literal("cash"),
  id: idSchema,
  amountEur: quantity(portfolioCashAmountSchema),
  effectiveAt: timestampSchema,
});

export type PortfolioCashBalance = z.infer<typeof portfolioCashBalanceSchema>;

export const setPortfolioCash = signedInRoute(portfolioWriterRoles)
  .route({
    method: "POST",
    path: "/users/{userId}/cash-balances",
    summary: "Set cash from a moment",
    successStatus: 201,
  })
  .input(
    z.object({
      userId: idSchema,
      amountEur: portfolioCashAmountSchema,
      effectiveAt: timestampSchema,
    }),
  )
  .output(portfolioCashBalanceSchema)
  .errors(
    errorMap("invalid_request", "forbidden", "not_found", "future_moment"),
  );

export const updatePortfolioCash = signedInRoute(portfolioWriterRoles)
  .route({
    method: "PATCH",
    path: "/cash-balances/{id}",
    summary: "Edit a cash balance",
  })
  .input(
    z
      .object({
        id: idSchema,
        amountEur: portfolioCashAmountSchema.optional(),
        effectiveAt: timestampSchema.optional(),
      })
      .refine(
        (body) =>
          body.amountEur !== undefined || body.effectiveAt !== undefined,
        { error: "Expected an amountEur or an effectiveAt" },
      ),
  )
  .output(portfolioCashBalanceSchema)
  .errors(
    errorMap("invalid_request", "forbidden", "not_found", "future_moment"),
  );

export const deletePortfolioCash = signedInRoute(portfolioWriterRoles)
  .route({
    method: "DELETE",
    path: "/cash-balances/{id}",
    summary: "Delete a cash balance",
    successStatus: 204,
  })
  .input(z.object({ id: idSchema }))
  .output(z.void())
  .errors(errorMap("invalid_request", "forbidden", "not_found"));
