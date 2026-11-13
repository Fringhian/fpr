import type { Db } from "../database.js";
import type { NewShare, Share, ShareUpdate } from "../tables/share.js";

/** The columns a share's row can change after it is created. */
export type ShareChanges = Pick<
  ShareUpdate,
  | "isin"
  | "name"
  | "kind"
  | "tradingCurrency"
  | "providerSymbol"
  | "exchange"
  | "historyStartsOn"
>;

/** The share with this id. */
export async function findById(db: Db, id: string): Promise<Share | undefined> {
  return db
    .selectFrom("shares")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

/** The share with this ISIN. */
export async function findByIsin(
  db: Db,
  isin: string,
): Promise<Share | undefined> {
  return db
    .selectFrom("shares")
    .selectAll()
    .where("isin", "=", isin)
    .executeTakeFirst();
}

/** Stores a share. */
export async function insert(db: Db, share: NewShare): Promise<Share> {
  return db
    .insertInto("shares")
    .values(share)
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * Changes a share's columns. Resolves with the changed row, or `undefined`
 * when no share has this id.
 */
export async function update(
  db: Db,
  id: string,
  changes: ShareChanges,
): Promise<Share | undefined> {
  if (Object.values(changes).every((value) => value === undefined)) {
    return findById(db, id);
  }
  return db
    .updateTable("shares")
    .set(changes)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

/**
 * Deletes a share with its prices and value edits. Resolves with whether a
 * share had this id.
 */
export async function remove(db: Db, id: string): Promise<boolean> {
  const { numDeletedRows } = await db
    .deleteFrom("shares")
    .where("id", "=", id)
    .executeTakeFirst();
  return numDeletedRows > 0n;
}
