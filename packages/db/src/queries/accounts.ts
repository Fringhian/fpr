import { sql } from "kysely";
import type { Db } from "../database.js";

/** Better Auth's provider id of a password account. */
const credential = "credential";

/** Whether the person has a password. */
export async function hasPassword(db: Db, userId: string): Promise<boolean> {
  const row = await db
    .selectFrom("account")
    .select("id")
    .where("userId", "=", userId)
    .where("providerId", "=", credential)
    .where("password", "is not", null)
    .limit(1)
    .executeTakeFirst();
  return row !== undefined;
}

/** The ids of the people with a password, among `userIds` when given. */
export async function idsWithPassword(
  db: Db,
  userIds?: readonly string[],
): Promise<Set<string>> {
  let query = db
    .selectFrom("account")
    .select("userId")
    .distinct()
    .where("providerId", "=", credential)
    .where("password", "is not", null);
  if (userIds !== undefined) {
    query = query.where("userId", "in", userIds);
  }
  const rows = await query.execute();
  return new Set(rows.map((row) => row.userId));
}

/**
 * Sets the person's password hash, made with Better Auth's hasher, on their
 * password account, created as Better Auth creates it when they have none.
 */
export async function setPassword(
  db: Db,
  userId: string,
  passwordHash: string,
): Promise<void> {
  const { numUpdatedRows } = await db
    .updateTable("account")
    .set({ password: passwordHash, updatedAt: sql<Date>`now()` })
    .where("userId", "=", userId)
    .where("providerId", "=", credential)
    .executeTakeFirst();
  if (numUpdatedRows > 0n) {
    return;
  }
  await db
    .insertInto("account")
    .values({
      accountId: userId,
      providerId: credential,
      userId,
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scope: null,
      password: passwordHash,
      updatedAt: sql<Date>`now()`,
    })
    .execute();
}
