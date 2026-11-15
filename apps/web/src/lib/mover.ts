import { type BarScale, barScale } from "./bar-track";
import { type GainInput, type GainUnit, gainAmount } from "./gain";

/**
 * The scale of a list of movers in each unit, so every bar is drawn against
 * the biggest mover in the unit it reads in: a holding bought during the
 * period has no percentage and reads in euros.
 */
export type MoverScale = Readonly<Record<GainUnit, BarScale>>;

/** The number a mover's bar draws, and the unit it reads in; `null` when its gain has no value. */
export function moverAmount(
  gain: GainInput,
  unit: GainUnit,
): { amount: number; unit: GainUnit } | null {
  const shown = gainAmount(gain, unit);
  return shown === null
    ? null
    : { amount: Number(shown.amount), unit: shown.unit };
}

/** The scale of a list of movers: in each unit, the lowest and highest gain they read as, with zero always inside. */
export function moverScale(
  gains: Iterable<GainInput>,
  unit: GainUnit,
): MoverScale {
  const shown = Array.from(gains, (gain) => moverAmount(gain, unit));
  const inUnit = (wanted: GainUnit) =>
    barScale(
      shown.map((mover) => (mover?.unit === wanted ? mover.amount : null)),
    );
  return { eur: inUnit("eur"), percent: inUnit("percent") };
}
