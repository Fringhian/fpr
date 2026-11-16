import type { Decimal, Language } from "@fpr/contracts";
import { decimalPattern } from "@fpr/contracts/values";
import { INTL_LOCALE } from "../language";
import { MINUS, NARROW_NBSP } from "./text";

// The spaces Intl writes in a number: a space, a no-break space, a narrow one.
const SPACES = /\s/g;

function isDecimal(value: string): value is `${number}` {
  return decimalPattern.test(value);
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
 * Formats a decimal string, then writes its minus as U+2212 and, in French,
 * each of its spaces as a narrow no-break space, whatever the browser's Intl
 * data.
 */
export function formatNumber(
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
export function signDisplay(
  signed: boolean,
): Intl.NumberFormatOptions["signDisplay"] {
  return signed ? "exceptZero" : "negative";
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
