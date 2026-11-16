import { Role } from "@fpr/contracts";
import { accessKeys, resetKeys, sessions } from "@fpr/db";
import { newKey } from "../access/keys.js";
import { apiError } from "../errors.js";
import { api } from "../implement.js";
import { signedIn } from "../pipeline/index.js";
import {
  accessLink,
  currentKey,
  lockPerson,
  readAdminPerson,
  refuseLastAdmin,
} from "./admin-person.js";

/**
 * Revokes the person's key and deletes their sessions at once. Like every
 * action here, it runs in one transaction that locks the person's row, so
 * two changes to one person's access run one after the other.
 */
export const revoke = api.admin.revoke
  .use(signedIn)
  .handler(async ({ context, input }) => {
    const user = await context.db.transaction().execute(async (trx) => {
      const person = await lockPerson(trx, input.id);
      await refuseLastAdmin(trx, person);
      await accessKeys.revoke(trx, (await currentKey(trx, person.id)).id);
      await sessions.deleteForUser(trx, person.id);
      return person;
    });
    return readAdminPerson(context.db, user);
  });

/** Clears the revocation: the person signs in again as before. */
export const restore = api.admin.restore
  .use(signedIn)
  .handler(async ({ context, input }) => {
    const user = await context.db.transaction().execute(async (trx) => {
      const person = await lockPerson(trx, input.id);
      await accessKeys.restore(trx, (await currentKey(trx, person.id)).id);
      return person;
    });
    return readAdminPerson(context.db, user);
  });

/**
 * Revokes the current key and creates a new one, waiting for first use, with
 * the same `accessUntil`. Returns the new link once.
 */
export const replaceLink = api.admin.replaceLink
  .use(signedIn)
  .handler(async ({ context, input }) => {
    const { key, codeHash } = newKey();
    const user = await context.db.transaction().execute(async (trx) => {
      const person = await lockPerson(trx, input.id);
      await refuseLastAdmin(trx, person);
      const replaced = await currentKey(trx, person.id);
      await accessKeys.revoke(trx, replaced.id);
      await accessKeys.insert(trx, {
        userId: person.id,
        codeHash,
        claimedAt: null,
        accessUntil: replaced.accessUntil,
        revokedAt: null,
        createdBy: context.viewer.id,
      });
      await sessions.deleteForUser(trx, person.id);
      return person;
    });
    return {
      person: await readAdminPerson(context.db, user),
      accessLink: accessLink(context.publicOrigin, key),
    };
  });

/**
 * A reset key valid 24 hours, returned once, replacing any unused one. An
 * anonymous viewer has no password to reset.
 */
export const resetKey = api.admin.resetKey
  .use(signedIn)
  .handler(async ({ context, input }) => {
    const { key, codeHash } = newKey();
    const created = await context.db.transaction().execute(async (trx) => {
      const person = await lockPerson(trx, input.id);
      if (person.role === Role.anonymous) {
        throw apiError("forbidden");
      }
      await resetKeys.revokeUnused(trx, person.id);
      return resetKeys.insert(trx, {
        userId: person.id,
        codeHash,
        usedAt: null,
        revokedAt: null,
        createdBy: context.viewer.id,
      });
    });
    return { resetKey: key, expiresAt: created.expiresAt.toISOString() };
  });
