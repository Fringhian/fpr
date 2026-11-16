import { api } from "../implement.js";
import { signedIn } from "../pipeline/index.js";
import { searchShares } from "./search.js";
import { readShare, readShareHolders, readSharePrices } from "./share-page.js";

/** The handlers of `apiContract.shares` that read stored shares and their prices. */
export const shareReads = {
  search: api.shares.search
    .use(signedIn)
    .handler(({ context, input }) => searchShares(context, input)),

  get: api.shares.get
    .use(signedIn)
    .handler(({ context, input }) => readShare(context, context.viewer, input)),

  prices: api.shares.prices
    .use(signedIn)
    .handler(({ context, input }) => readSharePrices(context, input)),

  holders: api.shares.holders
    .use(signedIn)
    .handler(({ context, input }) => readShareHolders(context, input)),
};
