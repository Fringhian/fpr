import type { IsoDate, Timestamp } from "@fpr/contracts";

/**
 * The race's time zone, where a day starts and a close is dated: the API's
 * `RACE_TIMEZONE` default, which no response carries.
 */
export const RACE_TIME_ZONE = "Europe/Paris";

const DAY_MS = 24 * 60 * 60 * 1000;

// `en-CA` writes a date as `YYYY-MM-DD`.
const dayFormat = new Intl.DateTimeFormat("en-CA", {
  timeZone: RACE_TIME_ZONE,
});

const offsetFormat = new Intl.DateTimeFormat("en-US", {
  timeZone: RACE_TIME_ZONE,
  timeZoneName: "longOffset",
});

/** The race's day a moment falls on: a close, at 23:59:59 there, falls on its trading day. */
export function raceDayOf(at: string | number): IsoDate {
  return dayFormat.format(new Date(at));
}

/** The day `days` after `day`, or before it when negative. */
export function addDays(day: IsoDate, days: number): IsoDate {
  return new Date(Date.parse(`${day}T12:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

function offsetMs(atMs: number): number {
  const name =
    offsetFormat.formatToParts(atMs).find(({ type }) => type === "timeZoneName")
      ?.value ?? "";
  const match = /GMT([+-])(\d{2}):(\d{2})/.exec(name);
  if (match === null) {
    return 0;
  }
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return (match[1] === "-" ? -minutes : minutes) * 60 * 1000;
}

/** The instant of a time of day, `HH:MM:SS`, on a day in the race's zone. */
export function localInstant(day: IsoDate, time: string): number {
  const asUtc = Date.parse(`${day}T${time}Z`);
  const first = asUtc - offsetMs(asUtc);
  return asUtc - offsetMs(first);
}

/**
 * The last second of a race day, 23:59:59 there: an entry dated on a past
 * day counts in that day's close and every holding read on that day.
 */
export function raceDayEnd(day: IsoDate): Timestamp {
  return new Date(localInstant(day, "23:59:59")).toISOString();
}

// How far before the device's clock something made today is dated, so a
// clock a little ahead of the API's never makes it a future moment.
const CLOCK_MARGIN_MS = 60_000;

/**
 * The moment something entered for `day` is saved at: a minute ago for
 * today, but never before the day starts; a past day's last second for
 * another, so it counts in that day's close.
 */
export function momentOfDay(day: IsoDate, today: IsoDate): Timestamp {
  if (day !== today) return raceDayEnd(day);
  const dayStart = localInstant(today, "00:00:00");
  return new Date(
    Math.max(Date.now() - CLOCK_MARGIN_MS, dayStart),
  ).toISOString();
}
