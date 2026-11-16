import type { Id, IsoDate, MemberSeriesPoint, Period } from "@fpr/contracts";
import {
  closeAt,
  dayOf,
  isTradingDay,
  periodStartDay,
  timestamp,
  tradingDays,
} from "./calendar.ts";
import { type Big, money } from "./decimal.ts";
import { toGain, withGains } from "./gain.ts";
import type { MockStore } from "./types.ts";
import { flowsOf, valuationAt } from "./valuation.ts";

/** A period as of the last close: the close it starts from, and every close in it. */
export type PeriodWindow = {
  startDay: IsoDate;
  startMs: number;
  /** The closes after the start, to the last one. */
  closes: number[];
  lastCloseMs: number;
  /**
   * A member whose first entry is after it is measured from that entry, with
   * a marker: the period's start, or for `all` the race's first close.
   */
  markAfterMs: number;
};

/** The window from a trading day's close to the last close. */
export function windowFrom(
  store: MockStore,
  startDay: IsoDate,
  markAfterMs = closeAt(startDay),
): PeriodWindow {
  const { lastCloseOn } = store.calendar;
  return {
    startDay,
    startMs: closeAt(startDay),
    closes: tradingDays(startDay, lastCloseOn).slice(1).map(closeAt),
    lastCloseMs: closeAt(lastCloseOn),
    markAfterMs,
  };
}

/** A person's first share change or cash balance, or `null` with none. */
export function firstEntryMs(store: MockStore, userId: Id): number | null {
  let first: number | null = null;
  for (const entry of store.entries) {
    if (entry.userId === userId && (first === null || entry.atMs < first)) {
      first = entry.atMs;
    }
  }
  return first;
}

/** The close of the first trading day ending at or after a moment. */
function firstCloseFrom(atMs: number): number {
  let day = dayOf(atMs);
  while (!isTradingDay(day) || closeAt(day) < atMs) {
    day = dayOf(closeAt(day) + 1000);
  }
  return closeAt(day);
}

/**
 * The race's window for a period, the same for every member: `all` starts
 * before the race's first entry, and marks only the members who started
 * after the first ones' first close.
 */
export function raceWindow(store: MockStore, period: Period): PeriodWindow {
  const lastCloseMs = closeAt(store.calendar.lastCloseOn);
  const firsts = store.entries.map((entry) => entry.atMs);
  const startDay = periodStartDay(
    store.calendar,
    period,
    dayOf(Math.min(lastCloseMs, ...firsts)),
  );
  if (period !== "all") {
    return windowFrom(store, startDay);
  }
  const firstCloses = firsts
    .map(firstCloseFrom)
    .filter((atMs) => atMs <= lastCloseMs);
  return windowFrom(
    store,
    startDay,
    firstCloses.length === 0 ? closeAt(startDay) : Math.min(...firstCloses),
  );
}

/** The day a member's gain is measured from when their first entry is after the window's mark. */
export function measuredFrom(
  store: MockStore,
  userId: Id,
  window: PeriodWindow,
): IsoDate | null {
  const first = firstEntryMs(store, userId);
  return first !== null && first > window.markAfterMs ? dayOf(first) : null;
}

/** A balance in a member's series. */
export type BalancePoint = {
  atMs: number;
  balanceEur: Big;
  /** The money added, minus the money taken out, up to the point: `flowsOf`. */
  flowsEur: Big;
  incomplete: boolean;
  /** A refresh after the last close: today's point, not final. */
  provisional: boolean;
};

/**
 * A member's balance series over the window, oldest first: each close from
 * the period's start, then each refresh since the last close with
 * `closesOnly` off, from their first entry on. The first point is the one
 * their gain is measured from.
 */
export function windowPoints(
  store: MockStore,
  userId: Id,
  window: PeriodWindow,
  { closesOnly }: { closesOnly: boolean },
): BalancePoint[] {
  const first = firstEntryMs(store, userId);
  if (first === null) {
    return [];
  }
  const instants = [window.startMs, ...window.closes];
  const moments = closesOnly
    ? instants
    : [...instants, ...store.calendar.provisional];
  const flowsAt = flowsOf(store, userId);
  return moments
    .filter((atMs) => atMs >= first)
    .map((atMs) => {
      const valuation = valuationAt(store, userId, atMs);
      return {
        atMs,
        balanceEur: valuation.balanceEur,
        flowsEur: flowsAt(atMs),
        incomplete: valuation.incomplete,
        provisional: atMs > window.lastCloseMs,
      };
    });
}

/** Each point with its gain since the first. */
export function toSeriesPoints(
  points: readonly BalancePoint[],
): MemberSeriesPoint[] {
  return withGains(points).map(({ point, gain }) => ({
    at: timestamp(point.atMs),
    balanceEur: money(point.balanceEur),
    gain: toGain(gain),
    provisional: point.provisional,
    incomplete: point.incomplete,
  }));
}

/** The period's start, then each close, then today's refreshes. */
export function windowInstants(
  store: MockStore,
  window: PeriodWindow,
): number[] {
  return [window.startMs, ...window.closes, ...store.calendar.provisional];
}
