// The contracts' `isinSchema` pattern, which `@fpr/contracts/values` doesn't export.
const ISIN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

/**
 * The ISIN a text holds, as the API takes it, or `null` when it isn't one:
 * two letters, nine letters or digits, and a check digit. Spaces and case
 * don't count, so a pasted `ie00 fprw ld01` is `IE00FPRWLD01`.
 */
export function isinIn(text: string): string | null {
  const isin = text.replace(/\s/g, "").toUpperCase();
  return ISIN.test(isin) ? isin : null;
}
