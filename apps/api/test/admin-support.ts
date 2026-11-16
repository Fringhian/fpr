/**
 * Helpers for the tests of the admin routes. Not part of the build.
 */
import type { Db } from "@fpr/db";
import { sql } from "kysely";

/**
 * Revokes the key of every admin but this one, so they are the only admin
 * with access: the last admin.
 */
export async function makeLastAdmin(db: Db, adminId: string): Promise<void> {
  await sql`
    update access_keys set revoked_at = now()
    where revoked_at is null
      and user_id <> ${adminId}
      and user_id in (select id from "user" where role = 'admin')
  `.execute(db);
}

/** Gives the person a cash balance: a portfolio entry with no share. */
export async function addCashBalance(db: Db, userId: string): Promise<void> {
  await db
    .insertInto("cashBalances")
    .values({
      userId,
      amountEur: "30.00",
      effectiveAt: new Date(Date.now() - 60_000),
      createdBy: userId,
    })
    .execute();
}
