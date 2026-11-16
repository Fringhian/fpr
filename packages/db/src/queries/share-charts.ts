import { sql } from "kysely";
import type { Db } from "../database.js";

/** A point of a share's chart. */
export interface SeriesPoint {
  at: Date;
  priceEur: string;
}

/**
 * Each share's chart points, oldest first, by share id: its price at `from`,
 * shown at `from`, then every close and value point after it, and the
 * intraday prices after `intradayAfter`, none when it is `null`. Without
 * `from`, every price.
 */
export async function series(
  db: Db,
  shareIds: readonly string[],
  { from, intradayAfter }: { from: Date | null; intradayAfter: Date | null },
): Promise<Map<string, SeriesPoint[]>> {
  const ids = [...shareIds];
  const start =
    from === null
      ? sql`select null::uuid, null::timestamptz, null::numeric where false`
      : sql`
          select ids.id, ${from}::timestamptz, start.price_eur
          from unnest(${ids}::uuid[]) ids(id)
          cross join lateral (
            select price_eur from prices
            where share_id = ids.id and at <= ${from}
            order by at desc
            limit 1
          ) start
        `;
  const { rows } = await sql<SeriesPoint & { shareId: string }>`
    select share_id, at, price_eur
    from (
      ${start}
      union all
      select share_id, at, price_eur from prices
      where share_id = any(${ids}::uuid[])
        and ${from === null ? sql`true` : sql`at > ${from}`}
        and (
          source <> 'intraday'
          or ${intradayAfter === null ? sql`false` : sql`at > ${intradayAfter}`}
        )
    ) points(share_id, at, price_eur)
    order by share_id, at
  `.execute(db);
  const points = new Map<string, SeriesPoint[]>();
  for (const { shareId, ...point } of rows) {
    points.set(shareId, [...(points.get(shareId) ?? []), point]);
  }
  return points;
}

/** The moment of the latest price stored, or `null` before the first. */
export async function latestPriceAt(db: Db): Promise<Date | null> {
  const { rows } = await sql<{ at: Date | null }>`
    select max(at) as at from prices
  `.execute(db);
  return rows[0]?.at ?? null;
}
