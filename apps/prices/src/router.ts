import { createMarket, lookup } from "./routes/lookup.js";
import {
  addManualPrice,
  deleteManualPrice,
  updateManualPrice,
} from "./routes/manual-prices.js";
import { fillHistory, refresh, refreshState } from "./routes/runs.js";
import {
  createManual,
  deleteShare,
  makeManual,
  updateShare,
} from "./routes/shares.js";

/** The handlers of the routes in `pricesContract`, with the same keys. */
export const pricesRouter = {
  lookup,
  createMarket,
  createManual,
  updateShare,
  fillHistory,
  addManualPrice,
  updateManualPrice,
  deleteManualPrice,
  deleteShare,
  makeManual,
  refresh,
  refreshState,
};
