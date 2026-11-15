import type { UTCTimestamp } from "lightweight-charts";
import type { Decimal, IsoDate } from "../../lib/format";

/** One point of a line: a calendar day and its value, the decimal string the API sends. */
export interface ChartPoint {
  day: IsoDate;
  value: Decimal;
}

/** What the model needs of a line: its points, and the day after which they are dashed. */
export interface ChartLineShape {
  points: readonly ChartPoint[];
  dashedAfter?: IsoDate | undefined;
}

const SECONDS_PER_DAY = 86_400;

/** A day as the chart's time: midnight UTC, in seconds. */
export function dayToTime(day: IsoDate): UTCTimestamp {
  return (Date.parse(`${day}T00:00:00Z`) / 1000) as UTCTimestamp;
}

/** The chart's time back as its day. */
export function timeToDay(time: number): IsoDate {
  return new Date(Math.floor(time / SECONDS_PER_DAY) * SECONDS_PER_DAY * 1000)
    .toISOString()
    .slice(0, 10);
}

function byDay(a: ChartPoint, b: ChartPoint): number {
  if (a.day === b.day) return 0;
  return a.day < b.day ? -1 : 1;
}

/**
 * A line cut in two at its last final day: the solid part up to and including
 * `dashedAfter`, and the dashed part after it, which starts on that same last
 * final point so the two join. Without `dashedAfter`, or with nothing after
 * it, the whole line is solid.
 */
export function splitLine({ points, dashedAfter }: ChartLineShape): {
  solid: ChartPoint[];
  dashed: ChartPoint[];
} {
  const sorted = points.toSorted(byDay);
  if (dashedAfter === undefined) {
    return { solid: sorted, dashed: [] };
  }
  const solid = sorted.filter((point) => point.day <= dashedAfter);
  const after = sorted.filter((point) => point.day > dashedAfter);
  if (after.length === 0) {
    return { solid, dashed: [] };
  }
  const join = solid.at(-1);
  return { solid, dashed: join ? [join, ...after] : after };
}

/** Every day any line has a point on, in order: the steps the arrow keys move along. */
export function chartDays(lines: readonly ChartLineShape[]): IsoDate[] {
  const days = new Set<IsoDate>();
  for (const line of lines) {
    for (const point of line.points) {
      days.add(point.day);
    }
  }
  return [...days].toSorted();
}

/**
 * A chart value as a decimal string, for the formatters of `lib/format`:
 * two decimals, and never a negative zero.
 */
export function toDecimal(value: number): Decimal {
  const text = value.toFixed(2);
  return /^-0\.0+$/.test(text) ? text.slice(1) : text;
}

/**
 * Where a key moves the active point among `count` points: one step with the
 * left and right arrows, to the ends with Home and End. The first arrow press
 * starts on the latest point. `undefined` when the key doesn't move it.
 */
export function stepIndex(
  key: string,
  current: number | null,
  count: number,
): number | undefined {
  if (count === 0) return undefined;
  const last = count - 1;
  switch (key) {
    case "ArrowLeft":
      return current === null ? last : Math.max(0, current - 1);
    case "ArrowRight":
      return current === null ? last : Math.min(last, current + 1);
    case "Home":
      return 0;
    case "End":
      return last;
    default:
      return undefined;
  }
}
