import { type AdminAccessStatus, type AdminPerson, Role } from "@fpr/contracts";
import {
  type AccessKey,
  accessKeys,
  accounts,
  type Db,
  type Trx,
  type User,
  users,
  violatedConstraint,
} from "@fpr/db";
import { keyState } from "../access/key-state.js";
import { apiError } from "../errors.js";
import { shownEmail, toPerson } from "../me/me.js";

/** Where a person's access stands, from their current key. */
function accessStatus(key: AccessKey, now: Date): AdminAccessStatus {
  // The current key is the latest, so it never reads as replaced.
  const state = keyState(key, key.id, now);
  if (state === "claimed") {
    return "active";
  }
  return state === "replaced" ? "revoked" : state;
}

/** Every person has a key from the moment they are added. */
function requireKey(key: AccessKey | undefined, userId: string): AccessKey {
  if (key === undefined) {
    throw new Error(`Person ${userId} has no access key`);
  }
  return key;
}

/**
 * People as the admin area lists them, from their current keys and who of
 * them has portfolio entries or a password. Reads everyone's keys, or only
 * the given people's when there are few.
 */
async function toAdminPeople(
  db: Db,
  people: User[],
  onlyThese: boolean,
): Promise<AdminPerson[]> {
  const ids = onlyThese ? people.map((user) => user.id) : undefined;
  const [keys, withEntries, withPassword] = await Promise.all([
    ids === undefined
      ? accessKeys.listCurrent(db)
      : Promise.all(ids.map((id) => accessKeys.findCurrent(db, id))),
    users.idsWithPortfolioEntries(db, ids),
    accounts.idsWithPassword(db, ids),
  ]);
  const keyOf = new Map(
    keys.flatMap((key) => (key ? [[key.userId, key]] : [])),
  );
  const now = new Date();
  return people.map((user) => {
    const key = requireKey(keyOf.get(user.id), user.id);
    return {
      ...toPerson(user),
      role: user.role,
      email: shownEmail(user),
      accessStatus: accessStatus(key, now),
      claimBefore: key.claimBefore.toISOString(),
      accessUntil: key.accessUntil?.toISOString() ?? null,
      hasPortfolioEntries: withEntries.has(user.id),
      hasPassword: withPassword.has(user.id),
    };
  });
}

/** Every person as the admin area lists them, in the order they were added. */
export async function listAdminPeople(db: Db): Promise<AdminPerson[]> {
  return toAdminPeople(db, await users.list(db), false);
}

/** One person as the admin area lists them. */
export async function readAdminPerson(
  db: Db,
  user: User,
): Promise<AdminPerson> {
  const [person] = await toAdminPeople(db, [user], true);
  if (person === undefined) {
    throw new Error(`Person ${user.id} could not be read`);
  }
  return person;
}

/** The person with this id, their row locked until the transaction ends, or `not_found`. */
export async function lockPerson(trx: Trx, id: string): Promise<User> {
  const user = await users.findByIdForUpdate(trx, id);
  if (user === undefined) {
    throw apiError("not_found");
  }
  return user;
}

/**
 * The person's current key. Read after `lockPerson`, which serializes every
 * change to a person's access.
 */
export async function currentKey(db: Db, userId: string): Promise<AccessKey> {
  return requireKey(await accessKeys.findCurrent(db, userId), userId);
}

/**
 * Refuses with `last_admin` to take an admin's role or access away while no
 * other admin has access. Takes the admins' lock first, so two admins
 * removing each other at once leave one.
 */
export async function refuseLastAdmin(trx: Trx, user: User): Promise<void> {
  if (user.role !== Role.admin) {
    return;
  }
  await users.lockAdmins(trx);
  if ((await accessKeys.countOtherAdminsWithAccess(trx, user.id)) === 0) {
    throw apiError("last_admin");
  }
}

/** `invalid_request` for one field its schema can't judge alone. */
export function invalidField(field: string) {
  return apiError("invalid_request", {
    issues: [{ path: [field], code: "custom" }],
  });
}

/** `email_taken` for a write the email's unique constraint refused, or the error as it is. */
export function emailTaken(error: unknown): unknown {
  return violatedConstraint(error) === "user_email_key"
    ? apiError("email_taken")
    : error;
}

/** The link that carries an access key: `<PUBLIC_URL>/access/<key>`. */
export function accessLink(publicOrigin: string, key: string): string {
  return `${publicOrigin}/access/${key}`;
}
