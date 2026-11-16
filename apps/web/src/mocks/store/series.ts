import type { Id, IsoDate, MemberSeriesPoint, Period } from "@fpr/contracts";
import {
  closeAt,
  dayOf,
  periodStartDay,
  timestamp,
  tradingDays,
} from "./calendar.ts";
import { money } from "./decimal.ts";
import { gainBetween, toGain } from "./gain.ts";
import { firstEntryOn } from "./people.ts";
import type { MockStore } from "./types.ts";
import { changesOf, valuationAt } from "./valuation.ts";

/** A period as of the last close: the close it starts from, and every close in it. */
export type PeriodWindow = {
  startDay: IsoDate;
  startMs: number;
  /** The closes after the start, to the last one. */
  closes: number[];
  lastCloseMs: number;
};

export function periodWindow(
  store: MockStore,
  period: Period,
  earliest: IsoDate | null,
): PeriodWindow {
  const { calendar } = store;
  const startDay = periodStartDay(
    calendar,
    period,
    earliest ?? calendar.lastCloseOn,
  );
  return {
    startDay,
    startMs: closeAt(startDay),
    closes: tradingDays(startDay, calendar.lastCloseOn).slice(1).map(closeAt),
    lastCloseMs: closeAt(calendar.lastCloseOn),
  };
}

/** The first entry of any of these people, for `all`. */
export function earliestEntry(
  store: MockStore,
  userIds: readonly Id[],
): IsoDate | null {
  const days = userIds.flatMap((id) => firstEntryOn(store, id) ?? []);
  return days.toSorted()[0] ?? null;
}

/**
 * The day a member's gain is measured from when their first entry is after
 * the period's start, else `null`.
 */
export function measuredFrom(
  store: MockStore,
  userId: Id,
  window: PeriodWindow,
): IsoDate | null {
  const first = firstEntryOn(store, userId);
  const firstClose = window.closes[0];
  const covered =
    firstClose === undefined ? window.startDay : dayOf(firstClose);
  return first !== null && first > covered ? first : null;
}

/**
 * A member's balance and gain since the period's start at each moment, from
 * their first entry on. A moment after the last close is provisional.
 */
export function seriesPoints(
  store: MockStore,
  userId: Id,
  window: PeriodWindow,
  instants: readonly number[],
): MemberSeriesPoint[] {
  const changes = changesOf(store, userId);
  const first = Math.min(
    ...store.entries
      .filter((entry) => entry.userId === userId)
      .map((entry) => entry.atMs),
  );
  return instants
    .filter((atMs) => atMs >= first)
    .map((atMs) => {
      const valuation = valuationAt(store, userId, atMs);
      return {
        at: timestamp(atMs),
        balanceEur: money(valuation.balanceEur),
        gain: toGain(gainBetween(store, changes, window.startMs, atMs)),
        provisional: atMs > window.lastCloseMs,
        incomplete: valuation.incomplete,
      };
    });
}

/** The period's start, then each close, then today's refreshes. */
export function windowInstants(
  store: MockStore,
  window: PeriodWindow,
): number[] {
  return [window.startMs, ...window.closes, ...store.calendar.provisional];
}
