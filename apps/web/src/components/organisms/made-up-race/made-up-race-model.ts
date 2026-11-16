import type { IsoDate } from "@fpr/contracts";
import type { MemberColor } from "../../../lib/member-color";
import { toDecimal } from "../../molecules/chart/chart-model";
import type { RaceMember } from "../race-card/race-card";

/**
 * An invented, repeatable curve of `length` values from zero to `gain`,
 * wandering on the way: the same for the same seed on every load.
 */
export function madeUpCurve(
  seed: number,
  gain: number,
  length: number,
): number[] {
  let state = seed;
  return Array.from({ length }, (_, index) => {
    state = (state * 16_807) % 2_147_483_647;
    const progress = length > 1 ? index / (length - 1) : 1;
    const wander = (state / 2_147_483_647 - 0.5) * 2.4;
    return gain * progress + wander * Math.sin(Math.PI * progress);
  });
}

/** The last `count` weekdays up to `today`, oldest first. */
function weekdaysUpTo(today: Date, count: number): IsoDate[] {
  const days: IsoDate[] = [];
  const day = new Date(
    Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()),
  );
  while (days.length < count) {
    const weekday = day.getUTCDay();
    if (weekday !== 0 && weekday !== 6) {
      days.unshift(day.toISOString().slice(0, 10));
    }
    day.setUTCDate(day.getUTCDate() - 1);
  }
  return days;
}

/** The invented runners: a name, a colour, and their gain at the end, in percent. */
const RUNNERS: readonly {
  id: string;
  name: string;
  color: MemberColor;
  gain: number;
}[] = [
  { id: "sam", name: "Sam", color: "vermilion", gain: 6.1 },
  { id: "alex", name: "Alex", color: "cobalt", gain: 4.2 },
  { id: "lea", name: "Lea", color: "green", gain: 3.9 },
  { id: "max", name: "Max", color: "violet", gain: 2.0 },
  { id: "noor", name: "Noor", color: "amber", gain: 0.8 },
  { id: "ines", name: "Ines", color: "pink", gain: -1.3 },
  { id: "theo", name: "Theo", color: "cyan", gain: -2.4 },
];

/** The runner drawn as “You”, in colour. */
export const MADE_UP_YOU = "alex";

/**
 * The made-up race over the last 22 weekdays up to `today`, in percent. It
 * shows what FPR draws before anyone signs in, and never holds real data.
 */
export function madeUpRace(today: Date): RaceMember[] {
  const days = weekdaysUpTo(today, 22);
  return RUNNERS.map(({ gain, ...runner }, index) => ({
    ...runner,
    points: madeUpCurve(31 + index * 97, gain, days.length).map(
      (value, day) => ({ day: days[day] ?? "", value: toDecimal(value) }),
    ),
  }));
}
