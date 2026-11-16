import type { IsoDate, Timestamp } from "@fpr/contracts";

const DAY_MS = 24 * 60 * 60 * 1000;

type Formats = { day: Intl.DateTimeFormat; offset: Intl.DateTimeFormat };

const formats = new Map<string, Formats>();

function formatsIn(timeZone: string): Formats {
  let zoneFormats = formats.get(timeZone);
  if (zoneFormats === undefined) {
    zoneFormats = {
      // `en-CA` writes a date as `YYYY-MM-DD`.
      day: new Intl.DateTimeFormat("en-CA", { timeZone }),
      offset: new Intl.DateTimeFormat("en-US", {
        timeZone,
        timeZoneName: "longOffset",
      }),
    };
    formats.set(timeZone, zoneFormats);
  }
  return zoneFormats;
}

/** The API's `RACE_TIMEZONE` default. */
export const DEFAULT_RACE_TIME_ZONE = "Europe/Paris";

// The default holds until a session names the instance's own zone: a
// signed-out page, such as setup or an access link, still dates days. The
// session loads in the root route, before any screen renders.
let zone = DEFAULT_RACE_TIME_ZONE;

/** The race's time zone, where a day starts and a close is dated. */
export function raceTimeZone(): string {
  return zone;
}

/** Takes the instance's time zone from the session, `GET /me`'s `raceTimeZone`. */
export function setRaceTimeZone(timeZone: string): void {
  zone = timeZone;
}

/** The day a moment falls on in a time zone. */
export function dayIn(timeZone: string, at: string | number): IsoDate {
  return formatsIn(timeZone).day.format(new Date(at));
}

/** The race's day a moment falls on: a close, at 23:59:59 there, falls on its trading day. */
export function raceDayOf(at: string | number): IsoDate {
  return dayIn(zone, at);
}

/** The race's day now, whatever the browser's time zone. */
export function raceToday(): IsoDate {
  return raceDayOf(Date.now());
}

/** Whether a moment or a day falls in the race's current year: a date outside it is written with its year. */
export function inThisYear(at: string | number): boolean {
  return raceDayOf(at).slice(0, 4) === raceToday().slice(0, 4);
}

/** The day `days` after `day`, or before it when negative. */
export function addDays(day: IsoDate, days: number): IsoDate {
  return new Date(Date.parse(`${day}T12:00:00Z`) + days * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

const OFFSET = /GMT([+-])(\d{2}):(\d{2})/;

function offsetMs(timeZone: string, atMs: number): number {
  const name =
    formatsIn(timeZone)
      .offset.formatToParts(atMs)
      .find(({ type }) => type === "timeZoneName")?.value ?? "";
  const match = OFFSET.exec(name);
  if (match === null) {
    return 0;
  }
  const minutes = Number(match[2]) * 60 + Number(match[3]);
  return (match[1] === "-" ? -minutes : minutes) * 60 * 1000;
}

/**
 * The instant of a time of day, `HH:MM:SS`, on a day in a time zone. The
 * offset is read twice: once at the wall time taken as UTC, then at the
 * instant that gives, so a day that changes clocks lands on the right side.
 */
export function instantIn(
  timeZone: string,
  day: IsoDate,
  time: string,
): number {
  const asUtc = Date.parse(`${day}T${time}Z`);
  const first = asUtc - offsetMs(timeZone, asUtc);
  return asUtc - offsetMs(timeZone, first);
}

/** The instant of a time of day, `HH:MM:SS`, on a day in the race's zone. */
export function localInstant(day: IsoDate, time: string): number {
  return instantIn(zone, day, time);
}

/**
 * The first moment of a race day, midnight there: a manual share's first
 * value dated then values every holding recorded that day.
 */
export function raceDayStart(day: IsoDate): Timestamp {
  return new Date(localInstant(day, "00:00:00")).toISOString();
}

/**
 * The last second of a race day, 23:59:59 there: an entry dated on a past
 * day counts in that day's close and every holding read on that day.
 */
export function raceDayEnd(day: IsoDate): Timestamp {
  return new Date(localInstant(day, "23:59:59")).toISOString();
}

// How far before the device's clock something made now is dated, so a
// clock a little ahead of the API's never makes it a future moment.
const CLOCK_MARGIN_MS = 60_000;

/**
 * The moment `at`, on `day`, is saved at: `at` itself, or a minute ago when
 * `at` is later, but never before the day starts.
 */
export function pastMomentOn(day: IsoDate, at: number): Timestamp {
  const dayStart = localInstant(day, "00:00:00");
  return new Date(
    Math.max(Math.min(at, Date.now() - CLOCK_MARGIN_MS), dayStart),
  ).toISOString();
}

/**
 * The moment something entered for `day` is saved at: a minute ago for
 * today, but never before the day starts; a past day's last second for
 * another, so it counts in that day's close.
 */
export function momentOfDay(day: IsoDate, today: IsoDate): Timestamp {
  return day === today ? pastMomentOn(today, Date.now()) : raceDayEnd(day);
}
