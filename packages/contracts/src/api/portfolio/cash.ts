import { z } from "zod";
import { quantity } from "../../anonymize.js";
import { errorMap, signedInRoute } from "../../contract.js";
import { decimalSchema } from "../../decimal.js";
import { writerRoles } from "../../roles.js";
import { clientIdSchema, idSchema } from "../../schemas/ids.js";
import { timestampSchema } from "../../schemas/time.js";

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

/** `POST /users/{userId}/cash-balances`: the member, and the cash balance. */
export const portfolioCashInputSchema = z.object({
  userId: idSchema,
  id: clientIdSchema,
  amountEur: portfolioCashAmountSchema,
  effectiveAt: timestampSchema,
});

export type PortfolioCashInput = z.input<typeof portfolioCashInputSchema>;

/**
 * With an `id` already stored for the member, answers that cash balance as it
 * is, with `201`, and saves nothing. An `id` another member's cash balance has
 * is refused with `forbidden`.
 */
export const setPortfolioCash = signedInRoute(writerRoles)
  .route({
    method: "POST",
    path: "/users/{userId}/cash-balances",
    summary: "Set cash from a moment",
    successStatus: 201,
  })
  .input(portfolioCashInputSchema)
  .output(portfolioCashBalanceSchema)
  .errors(
    errorMap("invalid_request", "forbidden", "not_found", "future_moment"),
  );

/** `PATCH /cash-balances/{id}`: what changes, at least one of the two. */
export const portfolioCashUpdateSchema = z
  .object({
    id: idSchema,
    amountEur: portfolioCashAmountSchema.optional(),
    effectiveAt: timestampSchema.optional(),
  })
  .refine(
    (body) => body.amountEur !== undefined || body.effectiveAt !== undefined,
    { error: "Expected an amountEur or an effectiveAt" },
  );

export type PortfolioCashUpdate = z.input<typeof portfolioCashUpdateSchema>;

export const updatePortfolioCash = signedInRoute(writerRoles)
  .route({
    method: "PATCH",
    path: "/cash-balances/{id}",
    summary: "Edit a cash balance",
  })
  .input(portfolioCashUpdateSchema)
  .output(portfolioCashBalanceSchema)
  .errors(
    errorMap("invalid_request", "forbidden", "not_found", "future_moment"),
  );

export const deletePortfolioCash = signedInRoute(writerRoles)
  .route({
    method: "DELETE",
    path: "/cash-balances/{id}",
    summary: "Delete a cash balance",
    successStatus: 204,
  })
  .input(z.object({ id: idSchema }))
  .output(z.void())
  .errors(errorMap("invalid_request", "forbidden", "not_found"));
