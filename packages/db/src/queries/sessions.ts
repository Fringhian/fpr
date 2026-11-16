import type { Db } from "../database.js";

/**
 * Deletes every session of the person, signing them out everywhere.
 * Resolves with how many it deleted.
 */
export async function deleteForUser(db: Db, userId: string): Promise<number> {
  const { numDeletedRows } = await db
    .deleteFrom("session")
    .where("userId", "=", userId)
    .executeTakeFirst();
  return Number(numDeletedRows);
}
