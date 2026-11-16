import type { Decimal, Language } from "@fpr/contracts";
import { decimalPattern } from "@fpr/contracts/values";
import Big from "big.js";
import { INTL_LOCALE } from "./language";

// The language's decimal mark, from Intl, and the marks accepted between
// thousands: Intl's own group mark, any space, and the other of `,` and `.`,
// as in “1.200,50” in French.
function marksOf(language: Language) {
  const parts = new Intl.NumberFormat(INTL_LOCALE[language]).formatToParts(
    12345.6,
  );
  const decimal = parts.find(({ type }) => type === "decimal")?.value ?? ".";
  const group = parts.find(({ type }) => type === "group")?.value ?? ",";
  const other = decimal === "," ? "." : ",";
  return {
    decimal,
    groups: [...new Set([group.replace(/\s/, " "), " ", other])],
  };
}

// A group mark counts only between groups of three digits: “1,20” in English
// is refused rather than read as 1.20 or 120.
function ungroup(whole: string, groups: readonly string[]): string | null {
  if (/^\d+$/.test(whole)) return whole;
  const mark = groups.find((group) =>
    new RegExp(`^\\d{1,3}(?:[${group}]\\d{3})+$`).test(whole),
  );
  return mark === undefined ? null : whole.replaceAll(mark, "");
}

/**
 * The decimal a person typed, read in their language, as the API takes it,
 * its decimals kept as typed. The decimal mark is the language's (`.` in
 * English, `,` in French); group marks count only between thousands; a euro
 * sign and leading zeros are fine. `null` when it isn't a number, or when it
 * could be read two ways.
 */
export function parseAmount(text: string, language: Language): Decimal | null {
  const { decimal, groups } = marksOf(language);
  const trimmed = text.replace(/€/g, "").replace(/\s+/g, " ").trim();
  const sign = /^[-−]/.test(trimmed) ? "-" : "";
  const [whole = "", fraction, ...rest] = trimmed
    .slice(sign.length)
    .trim()
    .split(decimal);
  if (rest.length > 0 || (fraction !== undefined && !/^\d+$/.test(fraction))) {
    return null;
  }
  const digits = ungroup(whole, groups);
  if (digits === null) return null;
  const amount = `${sign}${digits.replace(/^0+(?=\d)/, "")}${
    fraction === undefined ? "" : `.${fraction}`
  }`;
  return decimalPattern.test(amount) ? amount : null;
}

/** Whether `amount` is above zero, or, with `orZero`, zero or above. */
export function isPositive(amount: Decimal, orZero = false): boolean {
  const value = new Big(amount);
  return orZero ? value.gte(0) : value.gt(0);
}

/** The value of one unit typed, read in the person's language, or `null` unless it is above zero. */
export function priceIn(text: string, language: Language): Decimal | null {
  const price = parseAmount(text, language);
  return price !== null && isPositive(price) ? price : null;
}

/** A decimal as the person types it in their language: `74.328`, `74,328`. */
export function amountText(amount: Decimal, language: Language): string {
  return amount.replace(".", marksOf(language).decimal);
}
