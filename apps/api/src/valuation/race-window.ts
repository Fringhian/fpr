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

/**
 * Each point's gain since the first, which it is measured from: the balance's
 * change minus the flows between them, so money added or taken out is no
 * gain. The percentage is Modified Dietz: the gain over the first balance plus
 * each flow weighted by the fraction of the span left after it. A flow is
 * dated at the first point it shows in.
 */
export function withGains<
  P extends Pick<BalancePoint, "at" | "balanceEur" | "flowsEur">,
>(points: readonly P[]): { point: P; gain: GainAmount }[] {
  const [first] = points;
  if (first === undefined) {
    return [];
  }
  const start = new Big(first.balanceEur);
  const startFlows = new Big(first.flowsEur);
  // Σ Fᵢ·(tᵢ − t₀), so that Σ Fᵢ·(t − tᵢ)/(t − t₀) = added − timed/(t − t₀).
  let timed = new Big(0);
  let previous = startFlows;
  return points.map((point) => {
    const flows = new Big(point.flowsEur);
    const elapsed = point.at.getTime() - first.at.getTime();
    timed = timed.plus(flows.minus(previous).times(elapsed));
    previous = flows;
    const added = flows.minus(startFlows);
    const weighted = elapsed === 0 ? added : added.minus(timed.div(elapsed));
    const gain = {
      eur: new Big(point.balanceEur).minus(start).minus(added),
      base: start.plus(weighted),
    };
    return { point, gain };
  });
}

/** Each point with its gain since the first. */
export function toSeriesPoints(
  points: readonly BalancePoint[],
): MemberSeriesPoint[] {
  return withGains(points).map(({ point, gain }) => ({
    at: point.at.toISOString(),
    balanceEur: money(new Big(point.balanceEur)),
    gain: toGain(gain),
    provisional: point.provisional,
    incomplete: point.incomplete,
  }));
}
