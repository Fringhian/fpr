import type { Language } from "./language";

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
