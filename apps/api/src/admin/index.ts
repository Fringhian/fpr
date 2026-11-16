import { replaceLink, resetKey, restore, revoke } from "./access.js";
import { deletePerson } from "./delete-person.js";
import { addPerson, listPeople } from "./people.js";
import { updatePerson } from "./update-person.js";

/**
 * The handlers of `apiContract.admin`'s people and access routes. The
 * contracts' roles keep everyone but the admin out of every write; anonymous
 * viewers read the list, anonymized.
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
};
