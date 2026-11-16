import type { IsoDate } from "@fpr/contracts";
import type { ChartPoint } from "../components/molecules/chart/chart";
import { toDecimal } from "../components/molecules/chart/chart-model";

/** The weekdays of March 2026: the period the stories' invented curves cover. */
export const STORY_DAYS: readonly IsoDate[] = Array.from(
  { length: 31 },
  (_, index) =>
    new Date(Date.UTC(2026, 2, 1 + index)).toISOString().slice(0, 10),
).filter((day) => {
  const weekday = new Date(`${day}T00:00:00Z`).getUTCDay();
  return weekday !== 0 && weekday !== 6;
});

/**
 * An invented, repeatable random walk over the story days, ending on `end`:
 * the same curve on every load. `drift` leans each step, `swing` sizes it.
 */
export function walk(
  seed: number,
  end: number,
  drift: number,
  swing: number,
): ChartPoint[] {
  let state = seed;
  const steps = STORY_DAYS.map(() => {
    state = (state * 16_807) % 2_147_483_647;
    return (state / 2_147_483_647 - 0.5) * swing + drift;
  });
  let value = end - steps.reduce((sum, step) => sum + step, 0);
  return STORY_DAYS.map((day, index): ChartPoint => {
    value += steps[index] ?? 0;
    return { day, value: toDecimal(value) };
  });
}
