import { type RawBuilder, sql } from "kysely";

/** 23:59:59 of the day a moment falls on in the time zone, where that day's close is stored. */
export function dayClose(at: RawBuilder<unknown>, timeZone: string) {
  return sql`((${at} at time zone ${timeZone})::date + time '23:59:59')
    at time zone ${timeZone}`;
}

/** A column of the price a share is valued at. */
type ValueColumn = "at" | "price_eur" | "source";

/**
 * The price the `shares` row aliased `share` is valued at, at `at`, or now
 * when `at` is `null`: its latest price at or before it. With `fallback`,
 * before its first price, a manual share, or a market share whose provider
 * history starts late (`history_starts_on`), takes its earliest price.
 *
 * `join` is the lateral joins to add after the `shares` row, and `column`
 * reads the price's `at`, `price_eur` or `source`, null without one. The one
 * rule balances, holdings and share pages value a share by.
 */
export function shareValue(
  share: string,
  at: RawBuilder<unknown> | Date | null,
  {
    fallback,
    shareId = sql.ref(`${share}.id`),
  }: {
    fallback: boolean;
    /** The share's id, `share`'s own by default, or a column the query joined it on. */
    shareId?: RawBuilder<unknown>;
  },
): {
  join: RawBuilder<unknown>;
  column: (name: ValueColumn) => RawBuilder<unknown>;
} {
  const bound = at === null ? sql`true` : sql`at <= ${at}`;
  const earliest = fallback
    ? sql`${sql.ref(`${share}.kind`)} = 'manual'
        or ${sql.ref(`${share}.history_starts_on`)} is not null`
    : sql`false`;
  return {
    join: sql`
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
    `,
    column: (name) =>
      sql`coalesce(${sql.ref(`latest.${name}`)}, ${sql.ref(`earliest.${name}`)})`,
  };
}
