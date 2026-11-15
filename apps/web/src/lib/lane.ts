import type { Decimal } from "./format";
import type { GainInput, GainUnit } from "./gain";

/**
 * What a lane shows, by standings: a gain over the period in the unit
 * setting, or a balance. An anonymous viewer receives no euros, so their gain
 * reads in percent and their balance is `null`.
 */
export type LaneValue =
  | { board: "gain"; gain: GainInput; unit: GainUnit }
  | { board: "balance"; balance: Decimal | null };

/**
 * The lowest and highest values across the lanes, in the unit the bars draw.
 * `min` is at most zero and `max` at least zero, so the zero line sits at the
 * same place in every lane.
 */
export interface LaneScale {
  min: number;
  max: number;
}

/** A bar's geometry, in percent of the track's width. */
export interface LaneBar {
  /** Where the zero line sits. */
  zero: number;
  /** Where the bar starts: at the zero line for a gain, left of it for a loss. */
  start: number;
  width: number;
}

/**
 * The number a lane's bar draws: the gain in the unit asked for, in percent
 * when there are no euros (an anonymous viewer), or the balance in euros.
 * `null` when there is nothing to draw.
 */
export function laneAmount(value: LaneValue): number | null {
  if (value.board === "balance") {
    return value.balance === null ? null : Number(value.balance);
  }
  const eur = value.gain.eur ?? null;
  const amount =
    value.unit === "eur" && eur !== null ? eur : value.gain.percent;
  return amount === null ? null : Number(amount);
}

/** The scale every lane of one standings shares: from the lowest value to the highest, zero included. */
export function laneScale(values: Iterable<LaneValue>): LaneScale {
  let min = 0;
  let max = 0;
  for (const value of values) {
    const amount = laneAmount(value);
    if (amount !== null) {
      min = Math.min(min, amount);
      max = Math.max(max, amount);
    }
  }
  return { min, max };
}

const clamp = (percent: number): number => Math.min(100, Math.max(0, percent));

/**
 * The bar of an amount on a scale: from the zero line, rightwards for a gain
 * and leftwards for a loss, its length relative to the scale's whole span.
 */
export function laneBar(amount: number | null, scale: LaneScale): LaneBar {
  const min = Math.min(0, scale.min);
  const span = Math.max(0, scale.max) - min;
  if (span === 0) {
    return { zero: 0, start: 0, width: 0 };
  }
  const zero = clamp((-min / span) * 100);
  if (amount === null) {
    return { zero, start: zero, width: 0 };
  }
  const end = clamp(((amount - min) / span) * 100);
  return {
    zero,
    start: Math.min(zero, end),
    width: Math.abs(end - zero),
  };
}
