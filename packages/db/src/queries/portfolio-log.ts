import { type RawBuilder, sql } from "kysely";
import type { Db } from "../database.js";
import type { ShareKind } from "../tables/share.js";
import { valuedMoments } from "./value-moments.js";

/** A share change or a cash balance of a person's log, with what it changed. */
export type PortfolioLogRow = {
  id: string;
  effectiveAt: Date;
  /** The person who recorded it, empty once deleted. */
  madeBy: { id: string; displayName: string } | null;
  /** Where the entry sits in the log, for the next page's `before`. */
  cursor: string;
} & (
  | {
      type: "change";
      share: {
        id: string;
        isin: string;
        name: string;
        kind: ShareKind;
        providerSymbol: string | null;
      };
      quantityDelta: string;
      /** The quantity of the share held just after it. */
      quantityAfter: string;
    }
  | {
      type: "cash";
      amountEur: string;
      /** The cash just before it, or `null` before the first. */
      previousAmountEur: string | null;
    }
);

interface RawRow {
  type: "change" | "cash";
  id: string;
  effectiveAt: Date;
  /** `effective_at`, `created_at` and `id`, as the log's cursor. */
  cursor: string;
  madeById: string | null;
  madeByName: string | null;
  shareId: string | null;
  isin: string | null;
  name: string | null;
  kind: ShareKind | null;
  providerSymbol: string | null;
  quantityDelta: string | null;
  quantityAfter: string | null;
  amountEur: string | null;
  previousAmountEur: string | null;
}

const cursorPattern = /^(\d+)_(\d+)_([0-9a-f-]{36})$/;

/** Whether a `before` is a cursor the log gave. */
export function isCursor(before: string): boolean {
  return cursorPattern.test(before);
}

/**
 * Every entry of a person's log with what it changed, newest first: by
 * `effective_at`, then the order they were recorded. A cursor is each entry's
 * `effective_at` and `created_at` in microseconds since the epoch, and its
 * `id`, so it orders entries exactly.
 */
function logEntries(userId: string, where: RawBuilder<unknown>) {
  const micros = (column: string) =>
    sql`(extract(epoch from ${sql.ref(column)}) * 1000000)::bigint::text`;
  return sql<RawRow>`
    with entries as (
      select
        'change' as type, id, effective_at, created_at, created_by,
        share_id, quantity_delta,
        sum(quantity_delta) over (
          partition by share_id order by effective_at, created_at, id
        ) as quantity_after,
        null::numeric as amount_eur,
        null::numeric as previous_amount_eur
      from portfolio_changes
      where user_id = ${userId}
      union all
      select
        'cash', id, effective_at, created_at, created_by,
        null, null, null,
        amount_eur,
        lag(amount_eur) over (order by effective_at, created_at, id)
      from cash_balances
      where user_id = ${userId}
    )
    select
      entries.type,
      entries.id,
      entries.effective_at,
      ${micros("entries.effective_at")} || '_' || ${micros("entries.created_at")}
        || '_' || entries.id as cursor,
      author.id as made_by_id,
      author.display_name as made_by_name,
      shares.id as share_id,
      shares.isin,
      shares.name,
      shares.kind,
      shares.provider_symbol,
      entries.quantity_delta,
      entries.quantity_after,
      entries.amount_eur,
      entries.previous_amount_eur
    from entries
    left join shares on shares.id = entries.share_id
    left join "user" author on author.id = entries.created_by
    where ${where}
    order by entries.effective_at desc, entries.created_at desc, entries.id desc
  `;
}

function toRow(raw: RawRow): PortfolioLogRow {
  const base = {
    id: raw.id,
    effectiveAt: raw.effectiveAt,
    cursor: raw.cursor,
    madeBy:
      raw.madeById === null
        ? null
        : { id: raw.madeById, displayName: raw.madeByName ?? "" },
  };
  if (raw.type === "cash") {
    return {
      ...base,
      type: "cash",
      amountEur: raw.amountEur ?? "0",
      previousAmountEur: raw.previousAmountEur,
    };
  }
  return {
    ...base,
    type: "change",
    share: {
      id: raw.shareId ?? "",
      isin: raw.isin ?? "",
      name: raw.name ?? "",
      kind: raw.kind ?? "market",
      providerSymbol: raw.providerSymbol,
    },
    quantityDelta: raw.quantityDelta ?? "0",
    quantityAfter: raw.quantityAfter ?? "0",
  };
}

/**
 * A page of a person's log, newest first: the `limit` entries after the
 * cursor `before`, or from the newest without one. `before` must pass
 * `isCursor`.
 */
export async function page(
  db: Db,
  userId: string,
  { limit, before }: { limit: number; before?: string | undefined },
): Promise<PortfolioLogRow[]> {
  const match = before === undefined ? null : cursorPattern.exec(before);
  const after =
    match === null
      ? sql`true`
      : sql`(entries.effective_at, entries.created_at, entries.id) < (
          timestamptz 'epoch' + ${match[1]}::bigint * interval '1 microsecond',
          timestamptz 'epoch' + ${match[2]}::bigint * interval '1 microsecond',
          ${match[3]}::uuid
        )`;
  const { rows } = await sql<RawRow>`
    ${logEntries(userId, after)} limit ${limit}
  `.execute(db);
  return rows.map(toRow);
}

/** One entry of a person's log, by its id, or `undefined` when they have none with it. */
export async function find(
  db: Db,
  userId: string,
  id: string,
): Promise<PortfolioLogRow | undefined> {
  const { rows } = await logEntries(userId, sql`entries.id = ${id}`).execute(
    db,
  );
  const [raw] = rows;
  return raw === undefined ? undefined : toRow(raw);
}

/**
 * The weight of each of a person's entries in their balance at its moment,
 * in percent with two decimals, by entry id: a change's quantity at the
 * share's price then, or a cash balance's amount. What an anonymous viewer
 * sees in place of quantities and cash. An entry with no price, or at a
 * moment the balance is zero, has none.
 */
export async function weights(
  db: Db,
  userId: string,
  ids: readonly string[],
  timeZone: string,
): Promise<Map<string, string>> {
  if (ids.length === 0) {
    return new Map();
  }
  const balances = valuedMoments(
    sql`select distinct ${userId}::uuid as user_id, at, false as provisional from entries`,
    timeZone,
  );
  const { rows } = await sql<{ id: string; weight: string }>`
    with entries as (
      select id, effective_at as at, share_id, abs(quantity_delta) as quantity,
        null::numeric as amount
      from portfolio_changes
      where user_id = ${userId} and id = any(${ids}::uuid[])
      union all
      select id, effective_at, null, null, amount_eur
      from cash_balances
      where user_id = ${userId} and id = any(${ids}::uuid[])
    ),
    balances as (${balances}),
    valued as (
      select
        entries.id,
        coalesce(entries.amount, entries.quantity * price.price_eur) as value,
        balances.balance_eur
      from entries
      join balances on balances.at = entries.at
      left join lateral (
        select price_eur from prices
        where share_id = entries.share_id and at <= entries.at
        order by at desc
        limit 1
      ) price on true
    )
    select id::text, round(100 * value / balance_eur, 2)::text as weight
    from valued
    where value is not null and balance_eur > 0
  `.execute(db);
  return new Map(rows.map(({ id, weight }) => [id, weight]));
}

/** A person's log entries after a moment, oldest first. */
export async function after(
  db: Db,
  userId: string,
  at: Date,
): Promise<PortfolioLogRow[]> {
  const { rows } = await logEntries(
    userId,
    sql`entries.effective_at > ${at}`,
  ).execute(db);
  return rows.map(toRow).reverse();
}

/** How many share changes and cash balances a person has. */
export async function count(db: Db, userId: string): Promise<number> {
  const { rows } = await sql<{ count: string }>`
    select
      (select count(*) from portfolio_changes where user_id = ${userId})
      + (select count(*) from cash_balances where user_id = ${userId})
      as count
  `.execute(db);
  return Number(rows[0]?.count ?? 0);
}
