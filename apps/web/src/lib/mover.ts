import { type GainInput, type GainUnit, gainAmount } from "./gain";

/** The span of the movers' gains in one unit: `low` ≤ 0 ≤ `high`. */
export interface MoverRange {
  low: number;
  high: number;
}

/**
 * The span of a list of movers in each unit, so every bar is drawn against
 * the biggest mover in the unit it reads in.
 */
export type MoverScale = Readonly<Record<GainUnit, MoverRange>>;

/**
 * Where a mover's bar sits on its track, each as a fraction of the track's
 * width: the zero line, and the bar's length from it, to the right for a gain
 * and to the left for a loss.
 */
export interface MoverBar {
  zero: number;
  length: number;
  direction: "gain" | "loss";
}

/**
 * The scale of a list of movers: in each unit, the lowest and highest gain
 * they read as, with zero always inside.
 */
export function moverScale(
  gains: Iterable<GainInput>,
  unit: GainUnit,
): MoverScale {
  const scale = {
    eur: { low: 0, high: 0 },
    percent: { low: 0, high: 0 },
  } satisfies Record<GainUnit, MoverRange>;
  for (const gain of gains) {
    const shown = gainAmount(gain, unit);
    if (shown === null) {
      continue;
    }
    const value = Number(shown.amount);
    const range = scale[shown.unit];
    range.low = Math.min(range.low, value);
    range.high = Math.max(range.high, value);
  }
  return scale;
}

/**
 * A mover's bar on the scale of its list, or `null` when its gain has no
 * value. A track whose movers are all at zero puts its zero line at the start
 * and draws no bar.
 */
export function moverBar(
  gain: GainInput,
  unit: GainUnit,
  scale: MoverScale,
): MoverBar | null {
  const shown = gainAmount(gain, unit);
  if (shown === null) {
    return null;
  }
  const value = Number(shown.amount);
  const { low, high } = scale[shown.unit];
  const span = high - low;
  if (span <= 0) {
    return { zero: 0, length: 0, direction: "gain" };
  }
  return {
    zero: -low / span,
    length: Math.min(Math.abs(value) / span, 1),
    direction: value < 0 ? "loss" : "gain",
  };
}
