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

export {
  type AdminResetKeyResult,
  adminReplaceLink,
  adminResetKey,
  adminResetKeyResultSchema,
  adminRestore,
  adminRevoke,
} from "./access.js";
export {
  type AdminAccessStatus,
  type AdminAddPerson,
  type AdminPerson,
  type AdminPersonWithLink,
  type AdminUpdatePerson,
  adminAccessLinkSchema,
  adminAccessStatuses,
  adminAccessStatusSchema,
  adminAddPerson,
  adminAddPersonSchema,
  adminChangeableRoleSchema,
  adminDeletePerson,
  adminPeople,
  adminPersonSchema,
  adminPersonWithLinkSchema,
  adminUpdatePerson,
  adminUpdatePersonSchema,
} from "./people.js";
export {
  type AdminRefreshResult,
  adminRefreshPrices,
  adminRefreshResultSchema,
} from "./prices.js";
export {
  type AdminMakeManual,
  type AdminShare,
  type AdminShareGroups,
  adminMakeManual,
  adminMakeManualSchema,
  adminShareGroupsSchema,
  adminShareSchema,
  adminShares,
} from "./shares.js";

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
