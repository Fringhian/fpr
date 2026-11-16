import { createManualShare, lookUpShares } from "./create.js";
import { deleteShare, updateShare } from "./edit.js";
import { shareReads } from "./reads.js";
import { valuePointRoutes } from "./value-points.js";
import { listShareValueEvents, listShareValues } from "./values.js";

/**
 * The handlers of `apiContract.shares`. Reads come from Postgres. Every
 * write goes through the price service, the only writer of shares and
 * prices, and clears the balance series once it answers.
 */
export const sharesRouter = {
  ...shareReads,
  lookup: lookUpShares,
  createManual: createManualShare,
  update: updateShare,
  delete: deleteShare,
  values: listShareValues,
  valueEvents: listShareValueEvents,
  ...valuePointRoutes,
};
