import { type AdminUpdatePerson, Role } from "@fpr/contracts";
import {
  accessKeys,
  portfolioChanges,
  sessions,
  type Trx,
  type User,
  type UserChanges,
  users,
} from "@fpr/db";
import { apiError } from "../errors.js";
import { api } from "../implement.js";
import { signedIn } from "../pipeline/index.js";
import {
  currentKey,
  emailTaken,
  invalidField,
  lockPerson,
  readAdminPerson,
  refuseLastAdmin,
} from "./admin-person.js";

/**
 * The role rules: nobody becomes or stops being anonymous, a person with
 * portfolio entries can't become a guest, and the last admin keeps the role.
 * Making a guest takes the person's portfolio lock first, so a share change
 * written at the same moment can't slip in after the check.
 */
async function checkRole(
  trx: Trx,
  user: User,
  role: AdminUpdatePerson["role"],
) {
  if (role === undefined || role === user.role) {
    return;
  }
  if (role === Role.anonymous || user.role === Role.anonymous) {
    throw apiError("anonymous_role_fixed");
  }
  if (role === Role.guest) {
    await portfolioChanges.lockUser(trx, user.id);
    if ((await users.idsWithPortfolioEntries(trx, [user.id])).size > 0) {
      throw apiError("has_portfolio_entries");
    }
  }
  await refuseLastAdmin(trx, user);
}

/**
 * Moves when the person's access ends. A moment already past ends it, which
 * the last admin's access can't. Resolves with whether it ended.
 */
async function moveAccessUntil(
  trx: Trx,
  user: User,
  accessUntil: AdminUpdatePerson["accessUntil"],
): Promise<boolean> {
  if (accessUntil === undefined) {
    return false;
  }
  const until = accessUntil === null ? null : new Date(accessUntil);
  const ends = until !== null && until <= new Date();
  if (ends) {
    await refuseLastAdmin(trx, user);
  }
  const key = await currentKey(trx, user.id);
  await accessKeys.setAccessUntil(trx, key.id, until);
  return ends;
}

/**
 * Changes a person's display name, email, role, or access end date, in one
 * transaction that locks their row. Ending access deletes their sessions.
 */
export const updatePerson = api.admin.updatePerson
  .use(signedIn)
  .handler(async ({ context, input }) => {
    const { id, displayName, email, role, accessUntil } = input;
    const updated = await context.db
      .transaction()
      .execute(async (trx) => {
        const user = await lockPerson(trx, id);
        if (email !== undefined && user.role === Role.anonymous) {
          throw invalidField("email");
        }
        await checkRole(trx, user, role);
        if (await moveAccessUntil(trx, user, accessUntil)) {
          await sessions.deleteForUser(trx, user.id);
        }
        const changes: UserChanges = {
          ...(displayName === undefined ? {} : { displayName }),
          ...(email === undefined ? {} : { email }),
          ...(role === undefined ? {} : { role }),
        };
        return (await users.update(trx, user.id, changes)) ?? user;
      })
      .catch((error: unknown) => {
        throw emailTaken(error);
      });
    return readAdminPerson(context.db, updated);
  });
