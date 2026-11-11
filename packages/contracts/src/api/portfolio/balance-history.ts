import { z } from "zod";
import { euro } from "../../anonymize.js";
import { errorMap, signedInRoute } from "../../contract.js";
import { decimalSchema } from "../../decimal.js";
import { periodSchema } from "../../period.js";
import { roles } from "../../roles.js";
import { idSchema } from "../../schemas/ids.js";
import { timestampSchema } from "../../schemas/time.js";
import { portfolioLogEntrySchema } from "./log.js";

/** A member's balance at a moment: holdings × their value, plus cash. */
export const portfolioBalancePointSchema = z.object({
  at: timestampSchema,
  balanceEur: euro(decimalSchema),
  /** `true` for a refresh after the last close: today's points, not final. */
  provisional: z.boolean(),
  /** `true` when a holding had no price yet: the balance leaves it out. */
  incomplete: z.boolean(),
});

export type PortfolioBalancePoint = z.infer<typeof portfolioBalancePointSchema>;

/** A member's balance over the period, with the entries to mark on the chart. */
export const portfolioBalanceHistorySchema = z.object({
  /**
   * The balance at each close of the period from the member's first entry,
   * then at each refresh since the last close, oldest first.
   */
  points: euro(z.array(portfolioBalancePointSchema)),
  /** The share changes and cash balances in the period, oldest first. */
  entries: z.array(portfolioLogEntrySchema),
});

export type PortfolioBalanceHistory = z.infer<
  typeof portfolioBalanceHistorySchema
>;

export const getPortfolioBalanceHistory = signedInRoute(roles)
  .route({
    method: "GET",
    path: "/users/{userId}/balance-history",
    summary: "A member's balance over the period",
  })
  .input(z.object({ userId: idSchema, period: periodSchema }))
  .output(portfolioBalanceHistorySchema)
  .errors(errorMap("invalid_request", "not_found"));
