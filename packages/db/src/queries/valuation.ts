import { type RawBuilder, sql } from "kysely";
import type { Db } from "../database.js";
import {
  type Balance,
  type BalancePoint,
  valueMoments,
} from "./value-moments.js";

/** Every member's balance series, and the close it ends at. */
export interface BalanceSeries {
  /** 23:59:59 of the latest weekday that has ended, in the race's time zone. */
  lastCloseAt: Date;
  /** Each member with an entry, by id: their points, oldest first. */
  members: Map<string, BalancePoint[]>;
}

/** The moment the series is computed for, and the race's time zone. */
export interface SeriesClock {
  now: Date;
  timeZone: string;
}

/** Every person's share changes and cash balances, as `user_id` and `effective_at`. */
const entries = sql`
  select user_id, effective_at from portfolio_changes
  union all
  select user_id, effective_at from cash_balances
`;

/** The close of a day: 23:59:59 of it in the time zone. */
function closeOf(day: RawBuilder<unknown>, timeZone: string) {
  return sql`((${day})::date + time '23:59:59') at time zone ${timeZone}`;
}

/**
 * The moment of the last close: 23:59:59 of the latest weekday, Monday to
 * Friday, that has ended in the time zone. Closes are stored at that moment;
 * until the morning run stores them, the day is valued at its latest prices.
 */
export async function lastCloseAt(
  db: Db,
  { now, timeZone }: SeriesClock,
): Promise<Date> {
  const today = sql`(${now}::timestamptz at time zone ${timeZone})::date`;
  const { rows } = await sql<{ at: Date }>`
    select ${closeOf(sql`d`, timeZone)} as at
    from generate_series(
      (${today} - 7)::timestamp,
      ${today}::timestamp,
      interval '1 day'
    ) d
    where extract(isodow from d) < 6
      and ${closeOf(sql`d`, timeZone)} <= ${now}::timestamptz
    order by d desc
    limit 1
  `.execute(db);
  const [last] = rows;
  if (last === undefined) {
    throw new Error("No weekday ended in the last week");
  }
  return last.at;
}

/**
 * Each member's moments: every weekday's close from the day of their first
 * entry to the last close, then every intraday refresh since. A refresh is a
 * run of `intraday` prices written within 5 minutes of each other, at the
 * moment its last one was written.
 */
function seriesMoments(lastClose: Date, { now, timeZone }: SeriesClock) {
  return sql`
    with firsts as (
      select user_id, min(effective_at) as first_at
      from (${entries}) entries
      group by user_id
    ),
    closes as (
      select ${closeOf(sql`d`, timeZone)} as at, false as provisional
      from generate_series(
        (select min(first_at) at time zone ${timeZone} from firsts)::date
          ::timestamp,
        (${lastClose}::timestamptz at time zone ${timeZone})::date::timestamp,
        interval '1 day'
      ) d
      where extract(isodow from d) < 6
    ),
    writes as (
      select
        created_at,
        coalesce(
          created_at - lag(created_at) over (order by created_at)
            > interval '5 minutes',
          true
        ) as starts_run
      from prices
      where source = 'intraday'
        and at > ${lastClose}::timestamptz - interval '7 days'
        and created_at > ${lastClose}::timestamptz
        and created_at <= ${now}::timestamptz
    ),
    refreshes as (
      select max(created_at) as at, true as provisional
      from (
        select
          created_at,
          count(*) filter (where starts_run) over (order by created_at) as run
        from writes
      ) runs
      group by run
    )
    select firsts.user_id, moments.at, moments.provisional
    from firsts
    join (select * from closes union all select * from refreshes) moments
      on moments.at >= firsts.first_at
  `;
}

/**
 * Every member's balance at each weekday's close, from the day of their first
 * entry to the last close, then at each intraday refresh since. The one
 * series leaderboards, the race, and portfolios read.
 */
export async function balanceSeries(
  db: Db,
  clock: SeriesClock,
): Promise<BalanceSeries> {
  const lastClose = await lastCloseAt(db, clock);
  const rows = await valueMoments(
    db,
    seriesMoments(lastClose, clock),
    clock.timeZone,
  );
  const members = new Map<string, BalancePoint[]>();
  for (const { userId, ...point } of rows) {
    const points = members.get(userId) ?? [];
    points.push(point);
    members.set(userId, points);
  }
  return { lastCloseAt: lastClose, members };
}

/** Each member with an entry at or before a moment, and their balance at it, by id. */
export async function balancesAt(
  db: Db,
  { at, timeZone }: { at: Date; timeZone: string },
): Promise<Map<string, Balance>> {
  const rows = await valueMoments(
    db,
    sql`
      select user_id, ${at}::timestamptz as at, false as provisional
      from (${entries}) entries
      where effective_at <= ${at}::timestamptz
      group by user_id
    `,
    timeZone,
  );
  return new Map(
    rows.map(
      ({ userId, balanceEur, sharesEur, cashEur, flowsEur, incomplete }) => [
        userId,
        { balanceEur, sharesEur, cashEur, flowsEur, incomplete },
      ],
    ),
  );
}
