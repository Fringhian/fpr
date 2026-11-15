import type { IsoDate } from "@fpr/contracts";
import { dayIn } from "./time.js";

/** The hour the daily-closes run fetches the previous trading day's closes. */
export const DAILY_CLOSES_HOUR = 7;

/**
 * How many trading days, up to and including the last one, a held market
 * share may go without a close before it needs attention.
 */
export const ATTENTION_TRADING_DAYS = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The hour of a moment in a time zone, from 0 to 23. */
function hourIn(moment: Date, timeZone: string): number {
  return Number(
    new Intl.DateTimeFormat("en", {
      timeZone,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(moment),
  );
}

/** Midnight UTC of a calendar day, to step through days. */
function toMs(day: IsoDate): number {
  return Date.parse(`${day}T00:00:00Z`);
}

function toDay(ms: number): IsoDate {
  return new Date(ms).toISOString().slice(0, 10);
}

function isWeekday(ms: number): boolean {
  const weekday = new Date(ms).getUTCDay();
  return weekday !== 0 && weekday !== 6;
}

/** The last weekday strictly before a calendar day. */
function weekdayBefore(ms: number): number {
  let candidate = ms - DAY_MS;
  while (!isWeekday(candidate)) {
    candidate -= DAY_MS;
  }
  return candidate;
}

/**
 * The last trading day whose close the daily run has fetched, as
 * `YYYY-MM-DD`: the last weekday before today in `timeZone`, or before
 * yesterday until the run's hour. On Tuesday at 08:00 it is Monday; on
 * Tuesday at 06:00, Saturday, or Monday, it is the Friday before.
 */
export function lastTradingDay(now: Date, timeZone: string): IsoDate {
  const today = toMs(dayIn(now, timeZone));
  const reference =
    hourIn(now, timeZone) < DAILY_CLOSES_HOUR ? today - DAY_MS : today;
  return toDay(weekdayBefore(reference));
}

/**
 * The first of the last `ATTENTION_TRADING_DAYS` trading days, up to and
 * including the last trading day, as `YYYY-MM-DD`. A held market share with
 * no close from that day onward needs attention.
 */
export function attentionWindowStart(now: Date, timeZone: string): IsoDate {
  let day = toMs(lastTradingDay(now, timeZone));
  for (let count = 1; count < ATTENTION_TRADING_DAYS; count += 1) {
    day = weekdayBefore(day);
  }
  return toDay(day);
}
