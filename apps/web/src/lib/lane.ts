import { type BarScale, barScale } from "./bar-track";
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
export function laneScale(values: Iterable<LaneValue>): BarScale {
  return barScale(Array.from(values, laneAmount));
}
