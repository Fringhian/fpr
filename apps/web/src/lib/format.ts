import type { Language } from "./language";
import { MINUS, NARROW_NBSP } from "./typography";

/**
 * A quantity, price, amount, or percentage as the API sends it: a Postgres
 * `numeric` as a decimal string, such as `74.328` or `-1250.00`. The same
 * shape as `Decimal` in `@fpr/contracts`. A percentage is in percent: `12.5`
 * is 12.5 %.
 */
export type Decimal = string;

/** A calendar day, `YYYY-MM-DD`, as `IsoDate` in `@fpr/contracts`. */
export type IsoDate = string;

/**
 * A moment, ISO 8601 with its offset, such as `2026-03-02T17:30:00+01:00`, as
 * `Timestamp` in `@fpr/contracts`.
 */
export type Timestamp = string;

/** The Intl locale each language formats with: day before month, 24-hour clock. */
const INTL_LOCALE = {
  en: "en-GB",
  fr: "fr-FR",
} as const satisfies Record<Language, string>;

const DECIMAL = /^(?!-0(?:\.0+)?$)-?(?:0|[1-9]\d*)(?:\.\d+)?$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
// The spaces Intl writes in a number: a space, a no-break space, a narrow one.
const SPACES = /\s/g;

function isDecimal(value: string): value is `${number}` {
  return DECIMAL.test(value);
}

/** The decimal as Intl reads it, exactly, with no floating-point rounding. */
function numeric(value: Decimal): `${number}` {
  if (!isDecimal(value)) {
    throw new RangeError(`Expected a decimal string, got "${value}"`);
  }
  return value;
}

const numberFormats = new Map<string, Intl.NumberFormat>();

function numberFormat(
  language: Language,
  options: Intl.NumberFormatOptions,
): Intl.NumberFormat {
  const key = `${language} ${JSON.stringify(options)}`;
  let format = numberFormats.get(key);
  if (!format) {
    format = new Intl.NumberFormat(INTL_LOCALE[language], options);
    numberFormats.set(key, format);
  }
  return format;
}

/**
 * Formats a number, then writes its minus as U+2212 and, in French, each of
 * its spaces as a narrow no-break space, whatever the browser's Intl data.
 */
function formatNumber(
  value: Decimal,
  language: Language,
  options: Intl.NumberFormatOptions,
): string {
  const text = numberFormat(language, options)
    .format(numeric(value))
    .replaceAll("-", MINUS);
  return language === "fr" ? text.replace(SPACES, NARROW_NBSP) : text;
}

/**
 * Signed: a sign on every value but zero, once rounded. Unsigned: a minus on a
 * negative value only, never on a value that rounds to zero.
 */
function signDisplay(signed: boolean): Intl.NumberFormatOptions["signDisplay"] {
  return signed ? "exceptZero" : "negative";
}

export type MoneyPrecision = "cents" | "euros";

export interface MoneyOptions {
  /** `cents` (the default) for prices and amounts, `euros` for balances. */
  precision?: MoneyPrecision;
  /** A sign on every amount but zero, for gains: `+€512`, `−€18.30`. */
  signed?: boolean;
}

/** An amount in euros: `€1,234.56`, `1 234,56 €`. */
export function formatMoney(
  amount: Decimal,
  language: Language,
  { precision = "cents", signed = false }: MoneyOptions = {},
): string {
  const digits = precision === "cents" ? 2 : 0;
  return formatNumber(amount, language, {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: signDisplay(signed),
  });
}

export interface PercentOptions {
  /** A sign on every percentage but zero, for gains: `+4.2%`, `−1.3%`. */
  signed?: boolean;
}

/** A percentage, given in percent, with one decimal: `16.2%`, `16,2 %`. */
export function formatPercent(
  percent: Decimal,
  language: Language,
  { signed = false }: PercentOptions = {},
): string {
  return formatNumber(percent, language, {
    style: "unit",
    unit: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    signDisplay: signDisplay(signed),
  });
}

/** A gain, as the API sends it: `percent` is `null` from a start at zero. */
export interface Gain {
  eur: Decimal;
  percent: Decimal | null;
}

/** A gain in euros, then in percent when it has one: `+€512 (+4.2%)`. */
export function formatGain(
  gain: Gain,
  language: Language,
  { precision = "cents" }: Pick<MoneyOptions, "precision"> = {},
): string {
  const eur = formatMoney(gain.eur, language, { precision, signed: true });
  if (gain.percent === null) {
    return eur;
  }
  return `${eur} (${formatPercent(gain.percent, language, { signed: true })})`;
}

/**
 * A quantity with the decimals it was entered with, read from its string:
 * `74.328` stays 74.328, `10` stays 10, `1.50` stays 1.50.
 */
export function formatQuantity(quantity: Decimal, language: Language): string {
  const digits = quantity.split(".")[1]?.length ?? 0;
  return formatNumber(quantity, language, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

const DATE_STYLES = {
  short: { day: "numeric", month: "short" },
  long: { day: "numeric", month: "long" },
  weekday: { weekday: "short", day: "numeric", month: "short" },
} as const satisfies Record<string, Intl.DateTimeFormatOptions>;

export type DateStyle = keyof typeof DATE_STYLES;

export interface DateOptions {
  /** `short` (the default): `3 Mar`. `long`: `3 March`. `weekday`: `Tue 3 Mar`. */
  style?: DateStyle;
  /** Adds the year: `3 Mar 2026`. */
  year?: boolean;
  /** The time zone a timestamp's day is read in. The browser's by default. */
  timeZone?: string;
}

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

export interface TimeOptions {
  /** The time zone the time is read in. The browser's by default. */
  timeZone?: string;
}

/** A time of day, on the 24-hour clock: `14:30`. */
export function formatTime(
  at: Timestamp,
  language: Language,
  { timeZone }: TimeOptions = {},
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
