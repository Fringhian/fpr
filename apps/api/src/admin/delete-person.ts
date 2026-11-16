import { users } from "@fpr/db";
import { api } from "../implement.js";
import { signedIn } from "../pipeline/index.js";
import { lockPerson, refuseLastAdmin } from "./admin-person.js";

/**
 * Deletes a person with their account, sessions, keys, share changes, and
 * cash balances; what they authored stays, without its author (`database.md`
 * › Deletion). Their picture is removed from the bucket inside the
 * transaction: when the bucket refuses, the person stays.
 */
export const deletePerson = api.admin.deletePerson
  .use(signedIn)
  .handler(async ({ context, input }) => {
    await context.db.transaction().execute(async (trx) => {
      const person = await lockPerson(trx, input.id);
      await refuseLastAdmin(trx, person);
      await users.remove(trx, person.id);
      if (person.avatarKey !== null) {
        await context.avatars.remove(person.avatarKey);
      }
    });
  });
