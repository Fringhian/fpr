import {
  adminReplaceLink,
  adminResetKey,
  adminRestore,
  adminRevoke,
} from "./access.js";
import {
  adminAddPerson,
  adminDeletePerson,
  adminPeople,
  adminUpdatePerson,
} from "./people.js";
import { adminRefreshPrices } from "./prices.js";
import { adminMakeManual, adminShares } from "./shares.js";

export type * from "./access.js";
export type * from "./people.js";
export type * from "./prices.js";
export type * from "./shares.js";

/** The admin area: people, their access, shares, and price refreshes. */
export const adminContract = {
  people: adminPeople,
  addPerson: adminAddPerson,
  updatePerson: adminUpdatePerson,
  revoke: adminRevoke,
  restore: adminRestore,
  replaceLink: adminReplaceLink,
  resetKey: adminResetKey,
  deletePerson: adminDeletePerson,
  shares: adminShares,
  makeManual: adminMakeManual,
  refreshPrices: adminRefreshPrices,
};
