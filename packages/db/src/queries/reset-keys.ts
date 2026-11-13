import { sql } from "kysely";
import type { Db } from "../database.js";
import type { NewResetKey, ResetKey } from "../tables/reset-key.js";

/** Creates a key. `expiresAt` defaults to 24 hours from now. */
export async function insert(db: Db, key: NewResetKey): Promise<ResetKey> {
  return db
    .insertInto("resetKeys")
    .values(key)
    .returningAll()
    .executeTakeFirstOrThrow();
}

/** The key with this hash, whatever its state. */
export async function findByCodeHash(
  db: Db,
  codeHash: string,
): Promise<ResetKey | undefined> {
  return db
    .selectFrom("resetKeys")
    .selectAll()
    .where("codeHash", "=", codeHash)
    .executeTakeFirst();
}

/**
 * Sets `usedAt` on a key that is not used, not revoked, and not expired.
 * Resolves with the used row, or `undefined` when the key is unknown or can
 * no longer be used, so a key works once even under concurrent requests.
 */
export async function markUsed(
  db: Db,
  id: string,
): Promise<ResetKey | undefined> {
  return db
    .updateTable("resetKeys")
    .set({ usedAt: sql<Date>`now()` })
    .where("id", "=", id)
    .where("usedAt", "is", null)
    .where("revokedAt", "is", null)
    .where("expiresAt", ">", sql<Date>`now()`)
    .returningAll()
    .executeTakeFirst();
}

/**
 * Sets `revokedAt` on every key of the person that is neither used nor
 * revoked. Resolves with how many it revoked.
 */
export async function revokeUnused(db: Db, userId: string): Promise<number> {
  const { numUpdatedRows } = await db
    .updateTable("resetKeys")
    .set({ revokedAt: sql<Date>`now()` })
    .where("userId", "=", userId)
    .where("usedAt", "is", null)
    .where("revokedAt", "is", null)
    .executeTakeFirst();
  return Number(numUpdatedRows);
}
