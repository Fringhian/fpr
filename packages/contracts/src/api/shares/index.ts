import { createManualShare, updateShare } from "./manual.js";
import { lookUpShares, searchShares } from "./search.js";
import {
  deleteShare,
  getShare,
  getShareHolders,
  getSharePrices,
} from "./share.js";
import {
  addShareValue,
  deleteShareValue,
  getShareValueEvents,
  getShareValues,
  updateShareValue,
} from "./values.js";

export type * from "./manual.js";
export type * from "./schemas.js";
export type * from "./search.js";
export type * from "./share.js";
export type * from "./values.js";

/** Shares, lookups, and manual shares with their value points. */
export const sharesContract = {
  search: searchShares,
  lookup: lookUpShares,
  createManual: createManualShare,
  get: getShare,
  prices: getSharePrices,
  holders: getShareHolders,
  values: getShareValues,
  valueEvents: getShareValueEvents,
  update: updateShare,
  addValue: addShareValue,
  updateValue: updateShareValue,
  deleteValue: deleteShareValue,
  delete: deleteShare,
};
