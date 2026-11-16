import { randomUUID } from "node:crypto";
import { type AdminAddPerson, Role } from "@fpr/contracts";
import { accessKeys, type Trx, users } from "@fpr/db";
import { newKey } from "../access/keys.js";
import { takeFirstFreeColor } from "../colors.js";
import { api } from "../implement.js";
import { signedIn } from "../pipeline/index.js";
import {
  accessLink,
  emailTaken,
  invalidField,
  listAdminPeople,
  readAdminPerson,
} from "./admin-person.js";

/**
 * Inserts the person. An anonymous viewer gets `<id>@anonymous.invalid`,
 * which nobody sees, and needs no onboarding.
 */
async function insertPerson(trx: Trx, input: AdminAddPerson, color: number) {
  const anonymous = input.role === Role.anonymous;
  const user = await users.insert(trx, {
    email: anonymous ? `${randomUUID()}@anonymous.invalid` : input.email,
    displayName: input.displayName,
    role: input.role,
    color,
    avatarKey: null,
    locale: null,
    onboardedAt: anonymous ? new Date() : null,
  });
  if (!anonymous) {
    return user;
  }
  // The generated email is made of the id, known once inserted.
  const email = `${user.id}@anonymous.invalid`;
  return (await users.update(trx, user.id, { email })) ?? user;
}

export const listPeople = api.admin.people.handler(({ context }) =>
  listAdminPeople(context.db),
);

/**
 * Adds a person, with the first colour nobody has and a key to claim within
 * 7 days, and returns their link once. An access end date in the past is
 * refused.
 */
export const addPerson = api.admin.addPerson
  .use(signedIn)
  .handler(async ({ context, input }) => {
    const { db, viewer } = context;
    const accessUntil = input.accessUntil ? new Date(input.accessUntil) : null;
    if (accessUntil !== null && accessUntil <= new Date()) {
      throw invalidField("accessUntil");
    }
    const { key, codeHash } = newKey();
    const user = await db
      .transaction()
      .execute(async (trx) => {
        const added = await insertPerson(
          trx,
          input,
          await takeFirstFreeColor(trx),
        );
        await accessKeys.insert(trx, {
          userId: added.id,
          codeHash,
          claimedAt: null,
          accessUntil,
          revokedAt: null,
          createdBy: viewer.id,
        });
        return added;
      })
      .catch((error: unknown) => {
        throw emailTaken(error);
      });
    return {
      person: await readAdminPerson(db, user),
      accessLink: accessLink(context.publicOrigin, key),
    };
  });
