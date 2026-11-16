import type { GainAmount, GainUnit } from "./gain";

/**
 * The lowest and highest amounts a set of bars draws, zero included: `min`
 * is at most zero and `max` at least zero, so the zero line sits at the same
 * place on every track that shares the scale.
 */
export interface BarScale {
  min: number;
  max: number;
}

/** Where a bar sits on its track, in percent of the track's width. */
export interface BarGeometry {
  /** Where the zero line sits. */
  zero: number;
  /** The bar's length from the zero line. */
  length: number;
  /** Rightwards from the zero line for a gain, leftwards for a loss. */
  direction: "gain" | "loss";
}

/** The scale every bar of one set shares: from the lowest amount to the highest, zero included. `null` amounts are left out. */
export function barScale(amounts: Iterable<number | null>): BarScale {
  let min = 0;
  let max = 0;
  for (const amount of amounts) {
    if (amount !== null) {
      min = Math.min(min, amount);
      max = Math.max(max, amount);
    }
  }
  return { min, max };
}

/**
 * A scale per unit a gain reads in. A gain with no percentage (a start at
 * zero) reads in euros whatever the unit setting, so each bar is drawn against
 * the biggest bar of its own unit.
 */
export type UnitScale = Readonly<Record<GainUnit, BarScale>>;

/** The scale of a set of bars in each unit, from the values they read as (`gainAmount`). `null` values are left out. */
export function unitScale(amounts: Iterable<GainAmount | null>): UnitScale {
  const shown = Array.from(amounts);
  const inUnit = (unit: GainUnit) =>
    barScale(
      shown.map((value) =>
        value?.unit === unit ? Number(value.amount) : null,
      ),
    );
  return { eur: inUnit("eur"), percent: inUnit("percent") };
}

const clamp = (percent: number): number => Math.min(100, Math.max(0, percent));

/**
 * The bar of an amount on a scale: from the zero line, its length relative to
 * the scale's whole span. A `null` amount, or a scale with no span, draws no
 * bar; with no span the zero line sits at the start.
 */
export function barGeometry(
  amount: number | null,
  scale: BarScale,
): BarGeometry {
  const min = Math.min(0, scale.min);
  const span = Math.max(0, scale.max) - min;
  if (span === 0) {
    return { zero: 0, length: 0, direction: "gain" };
  }
  const zero = clamp((-min / span) * 100);
  if (amount === null) {
    return { zero, length: 0, direction: "gain" };
  }
  const end = clamp(((amount - min) / span) * 100);
  return {
    zero,
    length: Math.abs(end - zero),
    direction: end < zero ? "loss" : "gain",
  };
}
