import { z } from "zod";
import { euro, quantity } from "../../anonymize.js";
import { errorMap, signedInRoute } from "../../contract.js";
import { decimalSchema } from "../../decimal.js";
import { periodSchema } from "../../period.js";
import { roles } from "../../roles.js";
import { idSchema } from "../../schemas/ids.js";
import { percentSchema } from "../../schemas/money.js";
import { shareSummarySchema } from "../../schemas/share.js";
import { timestampSchema } from "../../schemas/time.js";

/**
 * A member's holding of one share at a moment of their balance series: the
 * quantity held, its value, and its weight in percent of their balance. The
 * value and weight are `null` while the share has no price, and the weight
 * while the balance is zero.
 */
export const portfolioHoldingHistoryPointSchema = z.object({
  at: timestampSchema,
  quantity: quantity(decimalSchema),
  valueEur: euro(decimalSchema.nullable()),
  weight: percentSchema.nullable(),
});

export type PortfolioHoldingHistoryPoint = z.infer<
  typeof portfolioHoldingHistoryPointSchema
>;

/**
 * The holding at each close of the period from the member's first entry,
 * then at each refresh since the last close, oldest first: the moments of
 * their balance history.
 */
export const portfolioHoldingHistorySchema = z.object({
  share: shareSummarySchema,
  points: z.array(portfolioHoldingHistoryPointSchema),
});

export type PortfolioHoldingHistory = z.infer<
  typeof portfolioHoldingHistorySchema
>;

/** `GET /users/{userId}/holdings/{shareId}/history?period=`. */
export const portfolioHoldingHistoryQuerySchema = z.object({
  userId: idSchema,
  shareId: idSchema,
  period: periodSchema,
});

export type PortfolioHoldingHistoryQuery = z.input<
  typeof portfolioHoldingHistoryQuerySchema
>;

/** Answers `not_found` for an unknown person or share, or a person with no portfolio. */
export const getPortfolioHoldingHistory = signedInRoute(roles)
  .route({
    method: "GET",
    path: "/users/{userId}/holdings/{shareId}/history",
    summary: "A member's holding of a share over the period",
  })
  .input(portfolioHoldingHistoryQuerySchema)
  .output(portfolioHoldingHistorySchema)
  .errors(errorMap("invalid_request", "not_found"));
