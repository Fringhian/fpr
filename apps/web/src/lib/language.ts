import type { Language } from "@fpr/contracts";
import { languages } from "@fpr/contracts/values";

/**
 * The language FPR starts in, until a person picks one in Settings, and the
 * one `pickLanguage` falls back to.
 */
export const DEFAULT_LANGUAGE: Language = "fr";

/** The Intl locale each language formats with: day before month, 24-hour clock. */
export const INTL_LOCALE = {
  en: "en-GB",
  fr: "fr-FR",
} as const satisfies Record<Language, string>;

function isLanguage(value: string): value is Language {
  return (languages as readonly string[]).includes(value);
}

/**
 * The first of the reader's languages, in their order of preference, that FPR
 * is written in, read from its primary subtag (`en-GB` reads as `en`).
 * French otherwise.
 */
export function pickLanguage(preferred: readonly string[]): Language {
  for (const tag of preferred) {
    const primary = tag.split("-")[0]?.toLowerCase() ?? "";
    if (isLanguage(primary)) {
      return primary;
    }
  }
  return DEFAULT_LANGUAGE;
}
