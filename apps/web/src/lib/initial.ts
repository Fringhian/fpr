import type { Language } from "./language";

/**
 * A name's initial: its first character as a reader sees it (an accented
 * letter or an emoji counts as one), upper-cased in the language. An empty
 * name has no initial.
 */
export function initialOf(name: string, language: Language): string {
  const segments = new Intl.Segmenter(language, { granularity: "grapheme" });
  const [first] = segments.segment(name.trim());
  return first ? first.segment.toLocaleUpperCase(language) : "";
}
