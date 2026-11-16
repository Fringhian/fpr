import { api } from "../implement.js";
import { signedIn } from "../pipeline/index.js";
import { readBalanceHistory, readHoldingHistory } from "./history-reads.js";
import { readHoldingAt } from "./holding-at.js";
import { readPortfolio } from "./portfolio.js";

/** The handlers of `apiContract.portfolio` that value a member's portfolio. */
export const portfolioReads = {
  get: api.portfolio.get
    .use(signedIn)
    .handler(({ context, input }) => readPortfolio(context, input)),

  holdingAt: api.portfolio.holdingAt
    .use(signedIn)
    .handler(({ context, input }) => readHoldingAt(context, input)),

  balanceHistory: api.portfolio.balanceHistory
    .use(signedIn)
    .handler(({ context, input }) => readBalanceHistory(context, input)),

  holdingHistory: api.portfolio.holdingHistory
    .use(signedIn)
    .handler(({ context, input }) => readHoldingHistory(context, input)),
};
