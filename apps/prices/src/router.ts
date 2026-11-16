import {
  addManualPrice,
  deleteManualPrice,
  updateManualPrice,
} from "./routes/manual-prices.js";
import {
  createManual,
  deleteShare,
  makeManual,
  updateShare,
} from "./routes/shares.js";

/**
 * The handlers of the routes in `pricesContract`, with the same keys. A route
 * without a handler yet is not served, and answers `not_found`.
 */
export const pricesRouter = {
  createManual,
  updateShare,
  addManualPrice,
  updateManualPrice,
  deleteManualPrice,
  deleteShare,
  makeManual,
};
