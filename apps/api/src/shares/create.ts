import { apiContract } from "@fpr/contracts";
import { api } from "../implement.js";
import { signedIn } from "../pipeline/index.js";
import { forwardRefusal } from "../prices/forward-refusal.js";

const { lookup, createManual } = apiContract.shares;

/**
 * `POST /shares/lookup`, the one route that reaches the provider. With
 * `isin`, `query` is the symbol of a listing the provider returned without an
 * ISIN, stored under the ISIN the member typed.
 */
export const lookUpShares = api.shares.lookup
  .use(signedIn)
  .handler(async ({ context, input }) => {
    const refused = forwardRefusal(lookup, context.req.log);
    if (input.isin === undefined) {
      return context.prices.lookup({ query: input.query }).catch(refused);
    }
    const share = await context.prices
      .createMarket({ symbol: input.query, isin: input.isin })
      .catch(refused);
    context.series.clear();
    return { shares: [share], listings: [] };
  });

/** `POST /shares/manual`, created by the viewer with its first value point. */
export const createManualShare = api.shares.createManual
  .use(signedIn)
  .handler(async ({ context, input }) => {
    const share = await context.prices
      .createManual({ ...input, createdBy: context.viewer.id })
      .catch(forwardRefusal(createManual, context.req.log));
    context.series.clear();
    return share;
  });
