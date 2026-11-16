// The contracts' `isinSchema` pattern, which `@fpr/contracts/values` doesn't export.
const ISIN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;

/**
 * Whether an ISIN's last digit is its check digit: the Luhn sum over its
 * characters, each letter written as its number (`A` 10 … `Z` 35).
 */
function checks(isin: string): boolean {
  const digits = [...isin].map((char) => Number.parseInt(char, 36)).join("");
  let sum = 0;
  for (let index = 0; index < digits.length; index += 1) {
    const digit = Number(digits[digits.length - 1 - index]);
    const doubled = index % 2 === 1 ? digit * 2 : digit;
    sum += doubled > 9 ? doubled - 9 : doubled;
  }
  return sum % 10 === 0;
}

/**
 * The ISIN a text holds, as the API takes it, or `null` when it isn't one:
 * two letters, nine letters or digits, and a check digit that matches the
 * rest. Spaces and case don't count, so a pasted `ie00 fprw ld09` is
 * `IE00FPRWLD09`.
 */
export function isinIn(text: string): string | null {
  const isin = text.replace(/\s/g, "").toUpperCase();
  return ISIN.test(isin) && checks(isin) ? isin : null;
}
