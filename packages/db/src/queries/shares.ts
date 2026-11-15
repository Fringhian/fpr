import { sql, type Transaction } from "kysely";
import type { Database, Db } from "../database.js";
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

/**
 * The share with this id, locked until the transaction ends, so writes to the
 * same share and its value points run one after the other.
 */
export async function lockById(
  trx: Transaction<Database>,
  id: string,
): Promise<Share | undefined> {
  return trx
    .selectFrom("shares")
    .selectAll()
    .where("id", "=", id)
    .forUpdate()
    .executeTakeFirst();
}

/**
 * Whether a market share needs attention: someone holds it, and it has no
 * close from `lastTradingDay` onward in `timeZone`, either because it has no
 * price yet or because its latest close is older. `false` for a manual share,
 * a share nobody holds, and an unknown id.
 */
export async function needsAttention(
  db: Db,
  id: string,
  lastTradingDay: string,
  timeZone: string,
): Promise<boolean> {
  const row = await db
    .selectFrom("shares")
    .select((eb) =>
      eb
        .and([
          eb.exists(
            eb
              .selectFrom("currentPositions")
              .select(sql.lit(1).as("one"))
              .whereRef("currentPositions.shareId", "=", "shares.id"),
          ),
          eb.not(
            eb.exists(
              eb
                .selectFrom("prices")
                .select(sql.lit(1).as("one"))
                .whereRef("prices.shareId", "=", "shares.id")
                .where("prices.source", "=", "close")
                .where(
                  "prices.at",
                  ">=",
                  sql<Date>`(${lastTradingDay}::date)::timestamp at time zone ${timeZone}`,
                ),
            ),
          ),
        ])
        .as("needsAttention"),
    )
    .where("id", "=", id)
    .where("kind", "=", "market")
    .executeTakeFirst();
  return row?.needsAttention === true;
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
