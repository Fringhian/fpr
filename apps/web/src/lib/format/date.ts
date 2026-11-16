import type { IsoDate, Language, Timestamp } from "@fpr/contracts";
import { INTL_LOCALE } from "../language";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const DATE_STYLES = {
  short: { day: "numeric", month: "short" },
  long: { day: "numeric", month: "long" },
  weekday: { weekday: "short", day: "numeric", month: "short" },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

type DateOptions = {
  /** `short` (the default): `3 Mar`. `long`: `3 March`. `weekday`: `Tue 3 Mar`. */
  style?: keyof typeof DATE_STYLES;
  /** Adds the year: `3 Mar 2026`. */
  year?: boolean | undefined;
  /** The time zone a timestamp's day is read in. The browser's by default. */
  timeZone?: string | undefined;
};

/**
 * A moment as a `Date`, and the time zone to read it in: a calendar day is
 * read in UTC, so it never moves to the day before or after.
 */
function moment(
  value: IsoDate | Timestamp,
  timeZone: string | undefined,
): { date: Date; timeZone: string | undefined } {
  const day = ISO_DATE.test(value);
  const date = new Date(day ? `${value}T00:00:00Z` : value);
  if (Number.isNaN(date.getTime())) {
    throw new RangeError(`Expected a date or a timestamp, got "${value}"`);
  }
  return { date, timeZone: day ? "UTC" : timeZone };
}

const dateFormats = new Map<string, Intl.DateTimeFormat>();

function dateFormat(
  language: Language,
  options: Intl.DateTimeFormatOptions,
): Intl.DateTimeFormat {
  const key = `${language} ${JSON.stringify(options)}`;
  let format = dateFormats.get(key);
  if (!format) {
    format = new Intl.DateTimeFormat(INTL_LOCALE[language], options);
    dateFormats.set(key, format);
  }
  return format;
}

/** A day, from a calendar day or a timestamp: `3 Mar`, `3 mars`. */
export function formatDate(
  value: IsoDate | Timestamp,
  language: Language,
  { style = "short", year = false, timeZone }: DateOptions = {},
): string {
  const at = moment(value, timeZone);
  return dateFormat(language, {
    ...DATE_STYLES[style],
    ...(year ? { year: "numeric" } : {}),
    ...(at.timeZone ? { timeZone: at.timeZone } : {}),
  }).format(at.date);
}

/**
 * A time of day, on the 24-hour clock: `14:30`. `timeZone` is the browser's
 * by default.
 */
export function formatTime(
  at: Timestamp,
  language: Language,
  { timeZone }: { timeZone?: string | undefined } = {},
): string {
  if (ISO_DATE.test(at)) {
    throw new RangeError(`Expected a timestamp, got the day "${at}"`);
  }
  const { date } = moment(at, timeZone);
  return dateFormat(language, {
    hour: "2-digit",
    minute: "2-digit",
    ...(timeZone ? { timeZone } : {}),
  }).format(date);
}
