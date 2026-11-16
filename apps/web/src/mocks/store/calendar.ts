import type { IsoDate, Period, Timestamp } from "@fpr/contracts";
import { addDays, localInstant, raceDayOf } from "../../lib/race-day.ts";

export { addDays, localInstant } from "../../lib/race-day.ts";

/** The day an instant falls on in the race's zone. */
export function dayOf(atMs: number): IsoDate {
  return raceDayOf(atMs);
}

export function timestamp(atMs: number): Timestamp {
  return new Date(atMs).toISOString();
}

export function isTradingDay(day: IsoDate): boolean {
  const weekday = new Date(`${day}T12:00:00Z`).getUTCDay();
  return weekday !== 0 && weekday !== 6;
}

/** The trading day itself, or the last one before it. */
export function tradingDayOnOrBefore(day: IsoDate): IsoDate {
  let current = day;
  while (!isTradingDay(current)) {
    current = addDays(current, -1);
  }
  return current;
}

/** Every trading day from `from` to `to`, both included. */
export function tradingDays(from: IsoDate, to: IsoDate): IsoDate[] {
  const days: IsoDate[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) {
    if (isTradingDay(day)) {
      days.push(day);
    }
  }
  return days;
}

/** A close is the price at 23:59:59 of its day. */
export function closeAt(day: IsoDate): number {
  return localInstant(day, "23:59:59");
}

/** The refreshes that store new prices on a trading day: every 30 minutes, 09:00 to 17:30. */
export function refreshInstants(day: IsoDate): number[] {
  return Array.from({ length: 18 }, (_, step) => {
    const minutes = 9 * 60 + step * 30;
    const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;
    return localInstant(day, time);
  });
}

/** How recent the last refresh is while refreshes run, as the API reads it. */
const RUNNING_WITHIN_MS = 45 * 60 * 1000;

/** The hour the daily run stores the previous trading day's closes. */
const DAILY_CLOSES_HOUR = "07:00:00";

/**
 * The market as of the store's clock, by the API's rules: the last close is
 * the latest trading day that has ended, and the refreshes since are
 * provisional. The daily run stores a day's close the next morning, so until
 * then that day is valued at its latest refresh.
 */
export type Calendar = {
  nowMs: number;
  today: IsoDate;
  lastCloseOn: IsoDate;
  /** The last trading day whose close is stored. */
  closesThrough: IsoDate;
  refreshesRunning: boolean;
  /** The refreshes since the last close, the provisional points. */
  provisional: number[];
};

export function createCalendar(now: Date): Calendar {
  const nowMs = now.getTime();
  const today = dayOf(nowMs);
  const lastCloseOn = tradingDayOnOrBefore(
    closeAt(today) <= nowMs ? today : addDays(today, -1),
  );
  const fetched = localInstant(today, DAILY_CLOSES_HOUR) <= nowMs;
  const provisional = isTradingDay(today)
    ? refreshInstants(today).filter((atMs) => atMs <= nowMs)
    : [];
  return {
    nowMs,
    today,
    lastCloseOn,
    closesThrough: tradingDayOnOrBefore(addDays(today, fetched ? -1 : -2)),
    refreshesRunning: provisional.some(
      (atMs) => nowMs - atMs <= RUNNING_WITHIN_MS,
    ),
    provisional,
  };
}

/** The same day `months` calendar months earlier, on the month's last day when it has fewer. */
function monthsBefore(day: IsoDate, months: number): IsoDate {
  const [year = 0, month = 1, date = 1] = day.split("-").map(Number);
  const first = new Date(Date.UTC(year, month - 1 - months, 1));
  const length = new Date(
    Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0),
  ).getUTCDate();
  first.setUTCDate(Math.min(date, length));
  return first.toISOString().slice(0, 10);
}

/**
 * The trading day whose close a period's gain starts from, counted back from
 * the last close: one day, seven days, one or three calendar months, the
 * previous year's last trading day, or for `all` the trading day before
 * `firstEntry`, the race's first entry.
 */
export function periodStartDay(
  calendar: Calendar,
  period: Period,
  firstEntry: IsoDate,
): IsoDate {
  const last = calendar.lastCloseOn;
  const targets: Record<Period, IsoDate> = {
    "1D": addDays(last, -1),
    "1W": addDays(last, -7),
    "1M": monthsBefore(last, 1),
    "3M": monthsBefore(last, 3),
    YTD: `${Number(last.slice(0, 4)) - 1}-12-31`,
    all: addDays(firstEntry, -1),
  };
  return tradingDayOnOrBefore(targets[period]);
}
