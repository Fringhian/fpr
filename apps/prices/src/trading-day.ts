/** The hour the daily-closes run fetches the previous trading day's closes. */
export const DAILY_CLOSES_HOUR = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/** The calendar day and hour of a moment in a time zone. */
function localDayAndHour(
  moment: Date,
  timeZone: string,
): { day: number; hour: number } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(moment)
      .map(({ type, value }) => [type, value]),
  );
  return {
    // The local day, as midnight UTC of the same calendar date.
    day: Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
    ),
    hour: Number(parts.hour),
  };
}

/**
 * The last trading day whose close the daily run has fetched, as
 * `YYYY-MM-DD`: the last weekday before today in `timeZone`, or before
 * yesterday until the run's hour. On Tuesday at 08:00 it is Monday; on
 * Tuesday at 06:00, Saturday, or Monday, it is the Friday before.
 */
export function lastTradingDay(now: Date, timeZone: string): string {
  const { day, hour } = localDayAndHour(now, timeZone);
  let candidate = hour < DAILY_CLOSES_HOUR ? day - 2 * DAY_MS : day - DAY_MS;
  for (;;) {
    const weekday = new Date(candidate).getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      return new Date(candidate).toISOString().slice(0, 10);
    }
    candidate -= DAY_MS;
  }
}
