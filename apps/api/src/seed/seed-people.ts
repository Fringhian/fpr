import { createHash, randomBytes } from "node:crypto";
import { accessKeys, type Db, type Role, users } from "@fpr/db";
import { type PersonKey, people, type SeedPerson } from "./data/people.js";
import { DAY_MS, type RaceClock } from "./seed-clock.js";
import { type IdOf, idOf } from "./seed-ids.js";

export interface SeededPerson {
  displayName: string;
  email: string;
  role: Role;
  /** Set for the anonymous viewer and for a link waiting for first use. */
  accessLink: string | null;
}

/**
 * Adds every person the way the admin does: a user and an access key, and a
 * password once they joined, except for the anonymous viewer. Returns their
 * ids and how each one signs in.
 */
export async function seedPeople(
  trx: Db,
  {
    clock,
    publicUrl,
    passwordHash,
  }: { clock: RaceClock; publicUrl: string; passwordHash: string },
): Promise<{ personId: IdOf<PersonKey>; signIns: SeededPerson[] }> {
  const ids = new Map<PersonKey, string>();
  const signIns: SeededPerson[] = [];
  for (const person of people) {
    const joined =
      person.joinedDay === null ? clock.now : clock.at(person.joinedDay, 9);
    const { id, email } = await insertUser(trx, person, joined);
    ids.set(person.key, id);
    const key = await insertAccessKey(trx, {
      userId: id,
      joined,
      waiting: person.joinedDay === null,
      createdBy: person.role === "admin" ? null : (ids.get("alex") ?? null),
    });
    if (person.joinedDay !== null && person.role !== "anonymous") {
      await insertPasswordAccount(trx, { userId: id, passwordHash, joined });
    }
    const linked = person.role === "anonymous" || person.joinedDay === null;
    signIns.push({
      displayName: person.displayName,
      email,
      role: person.role,
      accessLink: linked
        ? `${publicUrl.replace(/\/$/, "")}/access/${key}`
        : null,
    });
  }
  return { personId: idOf("person", ids), signIns };
}

async function insertUser(
  trx: Db,
  person: SeedPerson,
  joined: Date,
): Promise<{ id: string; email: string }> {
  const row = await users.insert(trx, {
    email: person.email ?? `seed-${person.key}@anonymous.invalid`,
    displayName: person.displayName,
    avatarKey: null,
    role: person.role,
    color: person.color,
    locale: person.locale,
    onboardedAt:
      person.joinedDay === null || person.role === "anonymous" ? null : joined,
    createdAt: joined,
    updatedAt: joined,
  });
  // An anonymous viewer's email is made of their id, known once inserted.
  const email = person.email ?? `${row.id}@anonymous.invalid`;
  if (person.email === null) {
    await users.update(trx, row.id, { email });
  }
  return { id: row.id, email };
}

async function insertAccessKey(
  trx: Db,
  {
    userId,
    joined,
    waiting,
    createdBy,
  }: {
    userId: string;
    joined: Date;
    /** Unclaimed, to claim within 7 days of the seed's run. */
    waiting: boolean;
    createdBy: string | null;
  },
): Promise<string> {
  const key = randomBytes(32).toString("base64url");
  await accessKeys.insert(trx, {
    userId,
    codeHash: createHash("sha256").update(key).digest("hex"),
    claimedAt: waiting ? null : joined,
    accessUntil: null,
    revokedAt: null,
    createdBy,
    createdAt: joined,
    ...(waiting
      ? {}
      : { claimBefore: new Date(joined.getTime() + 7 * DAY_MS) }),
  });
  return key;
}

async function insertPasswordAccount(
  trx: Db,
  {
    userId,
    passwordHash,
    joined,
  }: { userId: string; passwordHash: string; joined: Date },
): Promise<void> {
  await trx
    .insertInto("account")
    .values({
      accountId: userId,
      providerId: "credential",
      userId,
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scope: null,
      password: passwordHash,
      createdAt: joined,
      updatedAt: joined,
    })
    .execute();
}
