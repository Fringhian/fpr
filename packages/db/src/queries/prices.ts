import { sql } from "kysely";
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

/** How many prices from one source a share has. */
export async function count(
  db: Db,
  shareId: string,
  source: PriceSource,
): Promise<number> {
  const { count } = await db
    .selectFrom("prices")
    .select((eb) => eb.fn.countAll<string>().as("count"))
    .where("shareId", "=", shareId)
    .where("source", "=", source)
    .executeTakeFirstOrThrow();
  return Number(count);
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
 * stored for the share at the same moment. A replaced row takes a new
 * `createdAt`, so readers that watch the latest `createdAt` see the change.
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
        createdAt: sql<Date>`now()`,
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

/** The days of a share's earliest and latest closes in `timeZone`, `null` with none. */
export async function closeDays(
  db: Db,
  shareId: string,
  timeZone: string,
): Promise<{ first: string | null; last: string | null }> {
  const { rows } = await sql<{ first: string | null; last: string | null }>`
    select
      (min(at) at time zone ${timeZone})::date as first,
      (max(at) at time zone ${timeZone})::date as last
    from prices
    where share_id = ${shareId} and source = 'close'
  `.execute(db);
  return rows[0] ?? { first: null, last: null };
}

/**
 * Stores closes, each at 23:59:59 of its trading day in `timeZone`. A share
 * that already has a price at that moment keeps it. Resolves with how many
 * were stored.
 */
export async function insertCloses(
  db: Db,
  timeZone: string,
  closes: readonly { shareId: string; day: string; priceEur: string }[],
): Promise<number> {
  if (closes.length === 0) {
    return 0;
  }
  const result = await sql`
    insert into prices (share_id, at, price_eur, source)
    select t.share_id, (t.day + time '23:59:59') at time zone ${timeZone},
      t.price_eur, 'close'
    from unnest(
      ${closes.map((close) => close.shareId)}::uuid[],
      ${closes.map((close) => close.day)}::date[],
      ${closes.map((close) => close.priceEur)}::numeric[]
    ) as t (share_id, day, price_eur)
    on conflict (share_id, at) do nothing
  `.execute(db);
  return Number(result.numAffectedRows ?? 0n);
}

/**
 * Stores intraday prices, each only when it is newer than every price its
 * share already has. Resolves with the ids of the shares that got one.
 */
export async function insertIntradayIfNewer(
  db: Db,
  quotes: readonly { shareId: string; at: Date; priceEur: string }[],
): Promise<string[]> {
  if (quotes.length === 0) {
    return [];
  }
  const { rows } = await sql<{ shareId: string }>`
    insert into prices (share_id, at, price_eur, source)
    select t.share_id, t.at, t.price_eur, 'intraday'
    from unnest(
      ${quotes.map((quote) => quote.shareId)}::uuid[],
      ${quotes.map((quote) => quote.at.toISOString())}::timestamptz[],
      ${quotes.map((quote) => quote.priceEur)}::numeric[]
    ) as t (share_id, at, price_eur)
    where not exists (
      select 1 from prices p where p.share_id = t.share_id and p.at >= t.at
    )
    on conflict (share_id, at) do nothing
    returning share_id
  `.execute(db);
  return rows.map((row) => row.shareId);
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
