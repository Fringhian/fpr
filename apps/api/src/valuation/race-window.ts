import {
  type MemberSeriesPoint,
  type Period,
  writerRoles,
} from "@fpr/contracts";
import {
  type BalancePoint,
  type BalanceSeries,
  type Db,
  type FirstEntry,
  raceCalendar,
  type User,
  users,
} from "@fpr/db";
import { Big, type GainAmount, money, toGain } from "./decimal.js";
import type { SeriesCache } from "./series-cache.js";

/** A period as of the last close, over every member's balance series. */
export interface RaceWindow {
  series: BalanceSeries;
  firstEntries: Map<string, FirstEntry>;
  /** The close the period's gain starts from. */
  startAt: Date;
  /**
   * A member whose first entry is after it is measured from that entry, with
   * a marker: the period's start, or for `all` the race's first close, so the
   * first members to start are not marked.
   */
  markAfter: Date;
  /** The last close's day, `YYYY-MM-DD`. */
  lastCloseOn: string;
}

/** The members the race ranks: the admins and members, guests and anonymous viewers aside. */
export async function raceMembers(db: Db): Promise<User[]> {
  const everyone = await users.list(db);
  return everyone.filter((user) =>
    (writerRoles as readonly string[]).includes(user.role),
  );
}

export function dayIn(timeZone: string, at: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(at);
}

export async function raceWindow(
  context: { db: Db; series: SeriesCache; raceTimeZone: string },
  period: Period,
): Promise<RaceWindow> {
  const { db, raceTimeZone: timeZone } = context;
  const [series, firstEntries] = await Promise.all([
    context.series.get(),
    raceCalendar.firstEntries(db, timeZone),
  ]);
  const firstAt = [...firstEntries.values()].map(({ at }) => at.getTime());
  const startAt = await raceCalendar.periodStart(db, {
    period,
    lastCloseAt: series.lastCloseAt,
    firstEntryAt: new Date(Math.min(series.lastCloseAt.getTime(), ...firstAt)),
    timeZone,
  });
  const firstCloses = [...series.members.values()].flatMap(
    (points) => points.find((point) => !point.provisional)?.at.getTime() ?? [],
  );
  return {
    series,
    firstEntries,
    startAt,
    markAfter:
      period === "all" && firstCloses.length > 0
        ? new Date(Math.min(...firstCloses))
        : startAt,
    lastCloseOn: dayIn(timeZone, series.lastCloseAt),
  };
}

/**
 * A member's points from the period's start, oldest first, the closes alone
 * with `closesOnly`. The first is the one their gain is measured from.
 */
export function windowPoints(
  window: RaceWindow,
  userId: string,
  { closesOnly }: { closesOnly: boolean },
): BalancePoint[] {
  return (window.series.members.get(userId) ?? []).filter(
    (point) => point.at >= window.startAt && !(closesOnly && point.provisional),
  );
}

/** The day a member's gain is measured from when their first entry is after the period's start. */
export function measuredFrom(
  window: RaceWindow,
  userId: string,
): string | null {
  const first = window.firstEntries.get(userId);
  return first !== undefined && first.at > window.markAfter ? first.day : null;
}

/** A balance's gain since the one it is measured from. */
export function balanceGain(
  from: { balanceEur: string },
  to: { balanceEur: string },
): GainAmount {
  const base = new Big(from.balanceEur);
  return { eur: new Big(to.balanceEur).minus(base), base };
}

/** Each point with its gain since the first. */
export function toSeriesPoints(
  points: readonly BalancePoint[],
): MemberSeriesPoint[] {
  const [first] = points;
  return first === undefined
    ? []
    : points.map((point) => ({
        at: point.at.toISOString(),
        balanceEur: money(new Big(point.balanceEur)),
        gain: toGain(balanceGain(first, point)),
        provisional: point.provisional,
        incomplete: point.incomplete,
      }));
}
