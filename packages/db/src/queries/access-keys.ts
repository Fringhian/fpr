import { sql } from "kysely";
import type { Db } from "../database.js";
import type { AccessKey, NewAccessKey } from "../tables/access-key.js";

const momentOrNow = (at: Date | undefined) => at ?? sql<Date>`now()`;

/** Creates a key. `claimBefore` defaults to 7 days from now. */
export async function insert(db: Db, key: NewAccessKey): Promise<AccessKey> {
  return db
    .insertInto("accessKeys")
    .values(key)
    .returningAll()
    .executeTakeFirstOrThrow();
}

/** The key with this hash, whatever its state. */
export async function findByCodeHash(
  db: Db,
  codeHash: string,
): Promise<AccessKey | undefined> {
  return db
    .selectFrom("accessKeys")
    .selectAll()
    .where("codeHash", "=", codeHash)
    .executeTakeFirst();
}

/**
 * The key with this hash, whatever its state, locked until the transaction
 * ends: a claim or a sign-in reads it, then writes it, without another
 * request changing it in between.
 */
export async function lockByCodeHash(
  db: Db,
  codeHash: string,
): Promise<AccessKey | undefined> {
  return db
    .selectFrom("accessKeys")
    .selectAll()
    .where("codeHash", "=", codeHash)
    .forUpdate()
    .executeTakeFirst();
}

/** The person's latest key, whatever its state. */
export async function findCurrent(
  db: Db,
  userId: string,
): Promise<AccessKey | undefined> {
  return db
    .selectFrom("accessKeys")
    .selectAll()
    .where("userId", "=", userId)
    .orderBy("id", "desc")
    .limit(1)
    .executeTakeFirst();
}

/** Every person's latest key, one per person who has one. */
export async function listCurrent(db: Db): Promise<AccessKey[]> {
  return db
    .selectFrom("accessKeys")
    .selectAll()
    .distinctOn("userId")
    .orderBy("userId")
    .orderBy("id", "desc")
    .execute();
}

/**
 * Whether the person has access at `at`, now by default: they hold a key
 * that is claimed, not revoked, and not past `accessUntil`.
 */
export async function hasAccess(
  db: Db,
  userId: string,
  at?: Date,
): Promise<boolean> {
  const moment = momentOrNow(at);
  const row = await db
    .selectFrom("accessKeys")
    .select("id")
    .where("userId", "=", userId)
    .where("claimedAt", "is not", null)
    .where("revokedAt", "is", null)
    .where((eb) =>
      eb.or([eb("accessUntil", "is", null), eb("accessUntil", ">", moment)]),
    )
    .limit(1)
    .executeTakeFirst();
  return row !== undefined;
}

/**
 * How many admins other than this person have access now. Run under
 * `users.lockAdmins` before taking an admin's role or access away.
 */
export async function countOtherAdminsWithAccess(
  db: Db,
  userId: string,
): Promise<number> {
  const { count } = await db
    .selectFrom("user")
    .innerJoin("accessKeys", "accessKeys.userId", "user.id")
    .select((eb) => eb.fn.count<string>("user.id").distinct().as("count"))
    .where("user.role", "=", "admin")
    .where("user.id", "<>", userId)
    .where("accessKeys.claimedAt", "is not", null)
    .where("accessKeys.revokedAt", "is", null)
    .where((eb) =>
      eb.or([
        eb("accessKeys.accessUntil", "is", null),
        eb("accessKeys.accessUntil", ">", sql<Date>`now()`),
      ]),
    )
    .executeTakeFirstOrThrow();
  return Number(count);
}

/**
 * Sets `claimedAt` on a key not claimed yet, to `at` or now. Resolves with
 * the claimed row, or `undefined` when the key is unknown or already claimed.
 */
export async function claim(
  db: Db,
  id: string,
  at?: Date,
): Promise<AccessKey | undefined> {
  return db
    .updateTable("accessKeys")
    .set({ claimedAt: momentOrNow(at) })
    .where("id", "=", id)
    .where("claimedAt", "is", null)
    .returningAll()
    .executeTakeFirst();
}

/**
 * Sets `revokedAt` on a key not revoked yet. Resolves with the revoked row,
 * or `undefined` when the key is unknown or already revoked.
 */
export async function revoke(
  db: Db,
  id: string,
): Promise<AccessKey | undefined> {
  return db
    .updateTable("accessKeys")
    .set({ revokedAt: sql<Date>`now()` })
    .where("id", "=", id)
    .where("revokedAt", "is", null)
    .returningAll()
    .executeTakeFirst();
}

/**
 * Clears `revokedAt`. Resolves with the row, or `undefined` when the key is
 * unknown.
 */
export async function restore(
  db: Db,
  id: string,
): Promise<AccessKey | undefined> {
  return db
    .updateTable("accessKeys")
    .set({ revokedAt: null })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

/**
 * Moves when access ends; `null` means no end. Resolves with the row, or
 * `undefined` when the key is unknown.
 */
export async function setAccessUntil(
  db: Db,
  id: string,
  accessUntil: Date | null,
): Promise<AccessKey | undefined> {
  return db
    .updateTable("accessKeys")
    .set({ accessUntil })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}
