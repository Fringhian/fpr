import type { Language } from "@fpr/contracts";

/**
 * U+202F, the narrow no-break space of French typography: inside « », before
 * ; : ! ? and », and between the digits, sign, and unit of a French number.
 */
export const NARROW_NBSP = String.fromCodePoint(0x202f);

/** U+2212, the minus sign every negative number is written with. */
export const MINUS = String.fromCodePoint(0x2212);

/** Quotes a text in the language's quotation marks: “text” or « text ». */
export function quote(text: string, language: Language): string {
  return language === "fr"
    ? `«${NARROW_NBSP}${text}${NARROW_NBSP}»`
    : `“${text}”`;
}

const listFormats = new Map<Language, Intl.ListFormat>();

/** Names joined into one list: `Kim and Nora`, `Kim et Nora`. */
export function formatList(
  items: readonly string[],
  language: Language,
): string {
  let format = listFormats.get(language);
  if (!format) {
    format = new Intl.ListFormat(language, { type: "conjunction" });
    listFormats.set(language, format);
  }
  return format.format(items);
}
