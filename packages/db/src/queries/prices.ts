import type { Db } from "../database.js";
import type { NewPrice, Price, PriceSource } from "../tables/price.js";

/** One or more price sources to read from. */
export type PriceSources = readonly [PriceSource, ...PriceSource[]];

/** A share's price at exactly this moment. */
export async function find(
  db: Db,
  shareId: string,
  at: Date,
): Promise<Price | undefined> {
  return db
    .selectFrom("prices")
    .selectAll()
    .where("shareId", "=", shareId)
    .where("at", "=", at)
    .executeTakeFirst();
}

/**
 * A share's latest price at or before a moment: its value at that moment.
 * With `sources`, only prices from those sources count.
 */
export async function latestAt(
  db: Db,
  shareId: string,
  at: Date,
  sources?: PriceSources,
): Promise<Price | undefined> {
  let query = db
    .selectFrom("prices")
    .selectAll()
    .where("shareId", "=", shareId)
    .where("at", "<=", at);
  if (sources !== undefined) {
    query = query.where("source", "in", sources);
  }
  return query.orderBy("at", "desc").limit(1).executeTakeFirst();
}

/**
 * A share's prices from `from` to `to`, both included, oldest first. With
 * `sources`, only prices from those sources.
 */
export async function listBetween(
  db: Db,
  shareId: string,
  from: Date,
  to: Date,
  sources?: PriceSources,
): Promise<Price[]> {
  let query = db
    .selectFrom("prices")
    .selectAll()
    .where("shareId", "=", shareId)
    .where("at", ">=", from)
    .where("at", "<=", to);
  if (sources !== undefined) {
    query = query.where("source", "in", sources);
  }
  return query.orderBy("at").execute();
}

/**
 * Stores a price, replacing the price, source, and `enteredBy` of one already
 * stored for the share at the same moment.
 */
export async function upsert(db: Db, price: NewPrice): Promise<Price> {
  return db
    .insertInto("prices")
    .values(price)
    .onConflict((conflict) =>
      conflict.columns(["shareId", "at"]).doUpdateSet((eb) => ({
        priceEur: eb.ref("excluded.priceEur"),
        source: eb.ref("excluded.source"),
        enteredBy: eb.ref("excluded.enteredBy"),
      })),
    )
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * Deletes a share's price at exactly this moment. Resolves with whether one
 * was stored there.
 */
export async function remove(
  db: Db,
  shareId: string,
  at: Date,
): Promise<boolean> {
  const { numDeletedRows } = await db
    .deleteFrom("prices")
    .where("shareId", "=", shareId)
    .where("at", "=", at)
    .executeTakeFirst();
  return numDeletedRows > 0n;
}

/**
 * Deletes every share's `intraday` prices from before a moment. Resolves with
 * how many were deleted.
 */
export async function deleteIntradayBefore(
  db: Db,
  before: Date,
): Promise<number> {
  const { numDeletedRows } = await db
    .deleteFrom("prices")
    .where("source", "=", "intraday")
    .where("at", "<", before)
    .executeTakeFirst();
  return Number(numDeletedRows);
}
