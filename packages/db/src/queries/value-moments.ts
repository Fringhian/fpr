import { type RawBuilder, sql } from "kysely";
import type { Db } from "../database.js";

/** A member's balance at a moment, as decimal strings in EUR. */
export interface Balance {
  /** Holdings × their value, plus cash. */
  balanceEur: string;
  sharesEur: string;
  cashEur: string;
  /** A held share had no price, so the balance leaves it out. */
  incomplete: boolean;
}

/** A balance in a member's series. */
export interface BalancePoint extends Balance {
  at: Date;
  /** A refresh after the last close: today's point, not final. */
  provisional: boolean;
}

/**
 * Values each (`user_id`, `at`, `provisional`) row of `moments`, in one
 * query, oldest first per member:
 *
 * - a holding is the sum of its changes up to and including the moment;
 * - a share's value is its latest price at or before the moment. Before its
 *   first price, a manual share, or a market share whose provider history
 *   starts later (`history_starts_on`), takes its earliest price. Any other
 *   held share with no price is left out, and the balance is incomplete;
 * - cash is the latest balance at or before the moment, the one recorded last
 *   of two at the same moment, and zero before the first.
 *
 * Holdings and cash are read as steps, each value holding from its moment
 * until the next one, so each moment joins the one step it falls in. A price
 * is looked up once per share and moment, whoever holds it.
 */
export async function valueMoments(
  db: Db,
  moments: RawBuilder<unknown>,
): Promise<(BalancePoint & { userId: string })[]> {
  const { rows } = await valuedMoments(moments).execute(db);
  return rows;
}

/**
 * The query `valueMoments` runs, with columns `user_id`, `at`,
 * `provisional`, `balance_eur`, `shares_eur`, `cash_eur` and `incomplete`, to
 * build on in another query.
 */
export function valuedMoments(moments: RawBuilder<unknown>) {
  return sql<BalancePoint & { userId: string }>`
    with moments as (${moments}),
    holding_steps as (
      select
        user_id,
        share_id,
        effective_at as from_at,
        lead(effective_at) over steps as to_at,
        sum(sum(quantity_delta)) over steps as quantity
      from portfolio_changes
      where user_id in (select user_id from moments)
      group by user_id, share_id, effective_at
      window steps as (partition by user_id, share_id order by effective_at)
    ),
    cash_steps as (
      select
        user_id,
        amount_eur,
        effective_at as from_at,
        lead(effective_at) over (
          partition by user_id order by effective_at, created_at, id
        ) as to_at
      from cash_balances
      where user_id in (select user_id from moments)
    ),
    held as (
      select moments.user_id, moments.at, steps.share_id, steps.quantity
      from moments
      join holding_steps steps
        on steps.user_id = moments.user_id
        and steps.from_at <= moments.at
        and (steps.to_at is null or moments.at < steps.to_at)
      where steps.quantity > 0
    ),
    priced as (
      select
        held.share_id,
        held.at,
        coalesce(latest.price_eur, earliest.price_eur) as price_eur
      from (select distinct share_id, at from held) held
      join shares on shares.id = held.share_id
      left join lateral (
        select price_eur from prices
        where share_id = held.share_id and at <= held.at
        order by at desc
        limit 1
      ) latest on true
      left join lateral (
        select price_eur from prices
        where share_id = held.share_id
        order by at
        limit 1
      ) earliest
        on shares.kind = 'manual' or shares.history_starts_on is not null
    ),
    valued as (
      select
        moments.user_id,
        moments.at,
        moments.provisional,
        coalesce(sum(held.quantity * priced.price_eur), 0) as shares_eur,
        coalesce(
          bool_or(held.share_id is not null and priced.price_eur is null),
          false
        ) as incomplete
      from moments
      left join held
        on held.user_id = moments.user_id and held.at = moments.at
      left join priced
        on priced.share_id = held.share_id and priced.at = held.at
      group by moments.user_id, moments.at, moments.provisional
    )
    select
      valued.user_id,
      valued.at,
      valued.provisional,
      valued.shares_eur + coalesce(cash.amount_eur, 0) as balance_eur,
      valued.shares_eur,
      coalesce(cash.amount_eur, 0) as cash_eur,
      valued.incomplete
    from valued
    left join cash_steps cash
      on cash.user_id = valued.user_id
      and cash.from_at <= valued.at
      and (cash.to_at is null or valued.at < cash.to_at)
    order by valued.user_id, valued.at
  `;
}
