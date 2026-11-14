/** The languages FPR is written in. */
export const LANGUAGES = ["en", "fr"] as const;

export type Language = (typeof LANGUAGES)[number];

/** The language used when none of the reader's languages is supported. */
export const DEFAULT_LANGUAGE: Language = "fr";

export function isLanguage(value: string): value is Language {
  return (LANGUAGES as readonly string[]).includes(value);
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
