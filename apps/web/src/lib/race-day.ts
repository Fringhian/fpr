import type { IsoDate } from "@fpr/contracts";

/**
 * The race's time zone, where a day starts and a close is dated: the API's
 * `RACE_TIMEZONE` default, which no response carries.
 */
export const RACE_TIME_ZONE = "Europe/Paris";

// `en-CA` writes a date as `YYYY-MM-DD`.
const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: RACE_TIME_ZONE,
});

/** The race's day a moment falls on: a close, at 23:59:59 there, falls on its trading day. */
export function raceDayOf(at: string | number): IsoDate {
  return dayFormat.format(new Date(at));
}
