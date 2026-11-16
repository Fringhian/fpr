import { z } from "zod";
import { errorMap, signedInRoute } from "../../contract.js";
import { adminAreaRoles, adminRoles } from "../../roles.js";
import { refreshStateSchema } from "../../schemas/refresh.js";
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
 * first, then the latest prices in one batch. Refused with
 * `provider_unavailable` when no share could be priced.
 */
export const adminRefreshPrices = signedInRoute(adminRoles)
  .route({
    method: "POST",
    path: "/admin/prices/refresh",
    summary: "Run the price refresh now",
  })
  .output(adminRefreshResultSchema)
  .errors(
    errorMap(
      "forbidden",
      "refresh_running",
      "call_budget_used",
      "provider_unavailable",
    ),
  );

/**
 * The intraday refresh's state since the price service started: its last run
 * and result, the next scheduled run, the day's runs, and the day's provider
 * calls against the cap. Refused with `provider_unavailable` while the price
 * service doesn't answer.
 */
export const adminRefreshState = signedInRoute(adminAreaRoles)
  .route({
    method: "GET",
    path: "/admin/prices/refresh",
    summary: "The price refresh's state",
  })
  .output(refreshStateSchema)
  .errors(errorMap("forbidden", "provider_unavailable"));
