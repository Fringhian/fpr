import { type UnitScale, unitScale } from "./bar-track";
import type { Decimal } from "./format";
import {
  type GainAmount,
  type GainInput,
  type GainUnit,
  gainAmount,
} from "./gain";

/**
 * What a lane shows, by standings: a gain over the period in the unit
 * setting, or a balance. An anonymous viewer receives no euros, so their gain
 * reads in percent and their balance is `null`.
 */
export type LaneValue =
  | { board: "gain"; gain: GainInput; unit: GainUnit }
  | { board: "balance"; balance: Decimal | null };

/**
 * The value a lane's bar draws, in the unit it reads in: the gain as
 * `gainAmount` reads it, in euros without a percentage (a start at zero), or
 * the balance in euros. `null` when there is nothing to draw.
 */
export function laneAmount(value: LaneValue): GainAmount | null {
  if (value.board === "balance") {
    return value.balance === null
      ? null
      : { amount: value.balance, unit: "eur" };
  }
  return gainAmount(value.gain, value.unit);
}

/**
 * The scale every lane of one standings shares, in each unit: a lane is drawn
 * against the biggest lane that reads in its unit. The balance board reads in
 * euros only.
 */
export function laneScale(values: Iterable<LaneValue>): UnitScale {
  return unitScale(Array.from(values, laneAmount));
}
