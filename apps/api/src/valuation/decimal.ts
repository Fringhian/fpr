import type { Decimal, Gain } from "@fpr/contracts";
import Big from "big.js";

/** `value` with `places` decimals, or as precise as it is, never a negative zero. */
function fixed(value: Big, places?: number): Decimal {
  const text = value.toFixed(places);
  return /^-0(?:\.0+)?$/.test(text) ? text.slice(1) : text;
}

/** An amount in euros, with cents. */
export function money(value: Big): Decimal {
  return fixed(value, 2);
}

/** A quantity, as precise as it is. */
export function plain(value: Big): Decimal {
  return fixed(value);
}

/** `part` in percent of `whole`, with two decimals, or `null` while `whole` is zero. */
export function ratio(part: Big, whole: Big): Decimal | null {
  return whole.eq(0) ? null : fixed(part.div(whole).times(100), 2);
}

/** A gain in euros, and the amount its percentage is measured against. */
export interface GainAmount {
  eur: Big;
  base: Big;
}

export function toGain({ eur, base }: GainAmount): Gain {
  return { eur: money(eur), percent: ratio(eur, base) };
}

/** The gain in percent, unrounded, or `null` while its base is zero. */
export function gainPercent({ eur, base }: GainAmount): Big | null {
  return base.eq(0) ? null : eur.div(base).times(100);
}

export { Big };
