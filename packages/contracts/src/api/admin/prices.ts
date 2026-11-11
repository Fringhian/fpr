import { z } from "zod";
import { errorMap, signedInRoute } from "../../contract.js";
import { timestampSchema } from "../../schemas/time.js";

/** A finished price refresh. */
export const adminRefreshResultSchema = z.object({
  /** The held market shares that got a new price. */
  sharesPriced: z.int().nonnegative(),
  finishedAt: timestampSchema,
});

export type AdminRefreshResult = z.infer<typeof adminRefreshResultSchema>;

/**
 * Runs the intraday refresh now and answers once it is done: missing closes
 * first, then the latest prices in one batch.
 */
export const adminRefreshPrices = signedInRoute(["admin"])
  .route({
    method: "POST",
    path: "/admin/prices/refresh",
    summary: "Run the price refresh now",
  })
  .output(adminRefreshResultSchema)
  .errors(errorMap("forbidden", "refresh_running", "call_budget_used"));
