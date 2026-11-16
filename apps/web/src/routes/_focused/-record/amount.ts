import type { Decimal, Language } from "@fpr/contracts";
import { decimalPattern } from "@fpr/contracts/values";
import Big from "big.js";

/**
 * The decimal a person typed, as the API takes it, its decimals kept as
 * typed: a comma or a point, spaces between thousands, a euro sign and
 * leading zeros are fine. `null` when it isn't a number.
 */
export function parseAmount(text: string): Decimal | null {
  const decimal = text
    .replace(/[\s€]/g, "")
    .replace(",", ".")
    .replace(/^(-?)0+(?=\d)/, "$1");
  return decimalPattern.test(decimal) ? decimal : null;
}

/** Whether `amount` is above zero, or, with `orZero`, zero or above. */
export function isPositive(amount: Decimal, orZero = false): boolean {
  const value = new Big(amount);
  return orZero ? value.gte(0) : value.gt(0);
}

/** A decimal as the person types it in their language: `74.328`, `74,328`. */
export function amountText(amount: Decimal, language: Language): string {
  return language === "fr" ? amount.replace(".", ",") : amount;
}
