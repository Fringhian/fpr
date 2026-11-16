import type { Decimal } from "@fpr/contracts";
import Big from "big.js";

/**
 * A decimal string with `places` decimals, or as precise as the value without
 * them, never a negative zero.
 */
function fixed(value: Big, places?: number): Decimal {
  const text = value.toFixed(places);
  return /^-0(?:\.0+)?$/.test(text) ? text.slice(1) : text;
}

/** An amount in euros, with cents. */
export function money(value: Big): Decimal {
  return fixed(value, 2);
}

/** A percentage, with two decimals. */
export function percent(value: Big): Decimal {
  return fixed(value, 2);
}

/** A quantity, as precise as it is. */
export function plain(value: Big): Decimal {
  return fixed(value);
}

/** `part` in percent of `whole`, or `null` while `whole` is zero. */
export function ratio(part: Big, whole: Big): Decimal | null {
  return whole.eq(0) ? null : percent(part.div(whole).times(100));
}

export const zero = new Big(0);

export { Big };
