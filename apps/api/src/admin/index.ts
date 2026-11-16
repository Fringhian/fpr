import { replaceLink, resetKey, restore, revoke } from "./access.js";
import { deletePerson } from "./delete-person.js";
import { addPerson, listPeople } from "./people.js";
import { adminPriceRoutes } from "./prices.js";
import { adminShareRoutes } from "./shares.js";
import { updatePerson } from "./update-person.js";

/**
 * The handlers of `apiContract.admin`: people and their access, tracked
 * shares, and the price refresh. The contracts' roles keep everyone but the
 * admin out of every write; anonymous viewers read, anonymized.
 */
export const adminRouter = {
  people: listPeople,
  addPerson,
  updatePerson,
  revoke,
  restore,
  replaceLink,
  resetKey,
  deletePerson,
  ...adminShareRoutes,
  ...adminPriceRoutes,
};
