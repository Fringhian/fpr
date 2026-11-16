import { apiContract } from "@fpr/contracts";
import { api } from "../implement.js";
import { forwardRefusal } from "../prices/forward-refusal.js";

/** The admin's price refresh, run by the price service. */
export const adminPriceRoutes = {
  /** Answers once the run ends, a partial one included. */
  refreshPrices: api.admin.refreshPrices.handler(async ({ context }) => {
    const run = await context.prices
      .refresh()
      .catch(forwardRefusal(apiContract.admin.refreshPrices, context.req.log));
    context.series.clear();
    return { sharesPriced: run.sharesPriced, finishedAt: run.finishedAt };
  }),

  refreshState: api.admin.refreshState.handler(({ context }) =>
    context.prices
      .refreshState()
      .catch(forwardRefusal(apiContract.admin.refreshState, context.req.log)),
  ),
};
