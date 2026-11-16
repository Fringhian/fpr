import { sql } from "kysely";
import type { Db } from "../database.js";

/** The span a gain is measured over. */
export type RacePeriod = "1D" | "1W" | "1M" | "3M" | "YTD" | "all";

/**
 * The close a period's gain starts from, as of the last close: 23:59:59 of
 * the latest weekday on or before the day one period before the last close's
 * day, in the time zone. `YTD` starts at the previous year's last weekday,
 * and `all` at the weekday before `firstEntryAt`, the race's first entry.
 */
export async function periodStart(
  db: Db,
  {
    period,
    lastCloseAt,
    firstEntryAt,
    timeZone,
  }: {
    period: RacePeriod;
    lastCloseAt: Date;
    firstEntryAt: Date;
    timeZone: string;
  },
): Promise<Date> {
  const day = (at: Date) =>
    sql`(${at}::timestamptz at time zone ${timeZone})::date`;
  const last = day(lastCloseAt);
  const targets = {
    "1D": sql`${last} - 1`,
    "1W": sql`${last} - 7`,
    "1M": sql`(${last} - interval '1 month')::date`,
    "3M": sql`(${last} - interval '3 months')::date`,
    YTD: sql`date_trunc('year', ${last})::date - 1`,
    all: sql`${day(firstEntryAt)} - 1`,
  } satisfies Record<RacePeriod, unknown>;
  const { rows } = await sql<{ at: Date }>`
    select (d::date + time '23:59:59') at time zone ${timeZone} as at
    from generate_series(
      (${targets[period]} - 6)::timestamp,
      (${targets[period]})::timestamp,
      interval '1 day'
    ) d
    where extract(isodow from d) < 6
    order by d desc
    limit 1
  `.execute(db);
  const [start] = rows;
  if (start === undefined) {
    throw new Error("No weekday in the week before the period's start");
  }
  return start.at;
}

/** A person's first share change or cash balance. */
export interface FirstEntry {
  at: Date;
  /** Its day in the time zone, `YYYY-MM-DD`. */
  day: string;
}

/** Each person's first share change or cash balance, by user id. */
export async function firstEntries(
  db: Db,
  timeZone: string,
): Promise<Map<string, FirstEntry>> {
  const { rows } = await sql<FirstEntry & { userId: string }>`
    select
      user_id,
      min(effective_at) as at,
      (min(effective_at) at time zone ${timeZone})::date as day
    from (
      select user_id, effective_at from portfolio_changes
      union all
      select user_id, effective_at from cash_balances
    ) entries
    group by user_id
  `.execute(db);
  return new Map(rows.map(({ userId, ...entry }) => [userId, entry]));
}
