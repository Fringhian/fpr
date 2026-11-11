import { z } from "zod";
import { errorMap, signedInRoute } from "../../contract.js";
import { periodSchema } from "../../period.js";
import { roles } from "../../roles.js";
import { idSchema } from "../../schemas/ids.js";
import { memberSeriesPointSchema } from "../../schemas/performance.js";
import { portfolioLogEntrySchema } from "./log.js";

/** A member's balance over the period, with the entries to mark on the chart. */
export const portfolioBalanceHistorySchema = z.object({
  /**
   * The balance at each close of the period from the member's first entry,
   * then at each refresh since the last close, oldest first.
   */
  points: z.array(memberSeriesPointSchema),
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
