import { type RawBuilder, sql } from "kysely";
import type { Db } from "../database.js";
import type { PriceSource } from "../tables/price.js";

/** The price a share is valued at, with that price's own moment and source. */
export interface ShareValue {
  at: Date;
  priceEur: string;
  source: PriceSource;
}

/**
 * The price `shares` row `share` is valued at, at `at`, or now when `at` is
 * null: its latest price then. With `fallback`, before its first price, a
 * manual share, or a market share whose provider history starts late, takes
 * its earliest price, as balances do. Joined as `value`, empty without one.
 */
function valueJoin(
  share: string,
  at: RawBuilder<unknown> | Date | null,
  fallback: boolean,
) {
  const shareId = sql.ref(`${share}.id`);
  const bound = at === null ? sql`true` : sql`at <= ${at}`;
  const earliest = fallback
    ? sql`${sql.ref(`${share}.kind`)} = 'manual' or ${sql.ref(`${share}.history_starts_on`)} is not null`
    : sql`false`;
  return sql`
    left join lateral (
      select at, price_eur, source from prices
      where share_id = ${shareId} and ${bound}
      order by at desc
      limit 1
    ) latest on true
    left join lateral (
      select at, price_eur, source from prices
      where share_id = ${shareId}
      order by at
      limit 1
    ) earliest on ${earliest}
    cross join lateral (
      select
        coalesce(latest.at, earliest.at) as at,
        coalesce(latest.price_eur, earliest.price_eur) as price_eur,
        coalesce(latest.source, earliest.source) as source
    ) value
  `;
}

/**
 * Each share's value at a moment, or now without `at`, by share id. Without
 * `fallback`, a share counts only from its first price, as a price change
 * does. A share with no price is left out.
 */
export async function valuesAt(
  db: Db,
  shareIds: readonly string[],
  { at = null, fallback = true }: { at?: Date | null; fallback?: boolean } = {},
): Promise<Map<string, ShareValue>> {
  const { rows } = await sql<ShareValue & { shareId: string }>`
    select shares.id as share_id, value.at, value.price_eur, value.source
    from shares
    ${valueJoin("shares", at, fallback)}
    where shares.id = any(${[...shareIds]}::uuid[]) and value.at is not null
  `.execute(db);
  return new Map(rows.map(({ shareId, ...value }) => [shareId, value]));
}

/** Each share's first price, by share id. A share with no price is left out. */
export async function earliestValues(
  db: Db,
  shareIds: readonly string[],
): Promise<Map<string, ShareValue>> {
  const { rows } = await sql<ShareValue & { shareId: string }>`
    select distinct on (share_id) share_id, at, price_eur, source
    from prices
    where share_id = any(${[...shareIds]}::uuid[])
    order by share_id, at
  `.execute(db);
  return new Map(rows.map(({ shareId, ...value }) => [shareId, value]));
}

/** A share change, with the value of one unit of its share at its day's close. */
export interface ChangeAtDayValue {
  id: string;
  userId: string;
  shareId: string;
  quantityDelta: string;
  effectiveAt: Date;
  /** `null` while the share has no price. */
  dayPriceEur: string | null;
}

/**
 * The share changes of a person, of a share, or both, oldest first, each with
 * its share's value at 23:59:59 of its day in the time zone: the latest price
 * so far for today's.
 */
export async function changesAtDayValue(
  db: Db,
  { userId, shareId }: { userId?: string; shareId?: string },
  timeZone: string,
): Promise<ChangeAtDayValue[]> {
  const dayClose = sql`
    ((changes.effective_at at time zone ${timeZone})::date + time '23:59:59')
      at time zone ${timeZone}
  `;
  const { rows } = await sql<ChangeAtDayValue>`
    select
      changes.id,
      changes.user_id,
      changes.share_id,
      changes.quantity_delta,
      changes.effective_at,
      value.price_eur as day_price_eur
    from portfolio_changes changes
    join shares on shares.id = changes.share_id
    ${valueJoin("shares", dayClose, true)}
    where ${userId === undefined ? sql`true` : sql`changes.user_id = ${userId}`}
      and ${shareId === undefined ? sql`true` : sql`changes.share_id = ${shareId}`}
    order by changes.effective_at, changes.created_at, changes.id
  `.execute(db);
  return rows;
}

/** The shares someone held above zero at a moment. */
export async function heldAt(db: Db, at: Date): Promise<string[]> {
  const { rows } = await sql<{ shareId: string }>`
    select share_id
    from portfolio_changes
    where effective_at <= ${at}
    group by user_id, share_id
    having sum(quantity_delta) > 0
  `.execute(db);
  return [...new Set(rows.map(({ shareId }) => shareId))];
}

/** Whether any share change refers to the share. */
export async function everHeld(db: Db, shareId: string): Promise<boolean> {
  const { rows } = await sql<{ held: boolean }>`
    select exists (
      select 1 from portfolio_changes where share_id = ${shareId}
    ) as held
  `.execute(db);
  return rows[0]?.held === true;
}

/** A person's holding of a share at a moment, and the value of one unit then. */
export interface HoldingAtMoment {
  at: Date;
  quantity: string;
  /** `null` while the share has no price. */
  priceEur: string | null;
}

/** A person's holding of a share at each moment, valued as balances are, oldest first. */
export async function holdingAtMoments(
  db: Db,
  {
    userId,
    shareId,
    moments,
  }: { userId: string; shareId: string; moments: readonly Date[] },
): Promise<HoldingAtMoment[]> {
  const { rows } = await sql<HoldingAtMoment>`
    select
      moments.at,
      coalesce((
        select sum(quantity_delta) from portfolio_changes
        where user_id = ${userId}
          and share_id = ${shareId}
          and effective_at <= moments.at
      ), 0) as quantity,
      value.price_eur
    from unnest(${[...moments]}::timestamptz[]) moments(at)
    join shares on shares.id = ${shareId}
    ${valueJoin("shares", sql`moments.at`, true)}
    order by moments.at
  `.execute(db);
  return rows;
}
