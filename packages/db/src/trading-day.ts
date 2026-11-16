/** The hour the daily-closes run fetches the previous trading day's closes. */
const DAILY_CLOSES_HOUR = 7;

/**
 * How many trading days, up to and including the last one, a held market
 * share may go without a close before it needs attention.
 */
const ATTENTION_TRADING_DAYS = 5;

const DAY_MS = 24 * 60 * 60 * 1000;

/** From 0 to 23. */
function hourIn(moment: Date, timeZone: string): number {
  return Number(
    new Intl.DateTimeFormat("en", {
      timeZone,
      hour: "2-digit",
      hourCycle: "h23",
    }).format(moment),
  );
}

/** Midnight UTC of the calendar day a moment falls on in `timeZone`, to step through days. */
function dayMs(moment: Date, timeZone: string): number {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone }).format(moment);
  return Date.parse(`${day}T00:00:00Z`);
}

function toDay(ms: number): string {
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
export function lastTradingDay(now: Date, timeZone: string): string {
  const today = dayMs(now, timeZone);
  const reference =
    hourIn(now, timeZone) < DAILY_CLOSES_HOUR ? today - DAY_MS : today;
  return toDay(weekdayBefore(reference));
}

/**
 * The first of the last `ATTENTION_TRADING_DAYS` trading days, up to and
 * including the last trading day. A held market share with no close from that
 * day onward needs attention: the price service refuses to make any other
 * share manual, and the admin area groups shares by the same day.
 */
export function attentionWindowStart(now: Date, timeZone: string): string {
  let day = Date.parse(`${lastTradingDay(now, timeZone)}T00:00:00Z`);
  for (let count = 1; count < ATTENTION_TRADING_DAYS; count += 1) {
    day = weekdayBefore(day);
  }
  return toDay(day);
}
