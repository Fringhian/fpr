import type { Decimal, IsoDate, Language } from "@fpr/contracts";
import type { Time, UTCTimestamp } from "lightweight-charts";
import {
  formatMoney,
  formatPercent,
  type MoneyPrecision,
} from "../../../lib/format/money";
import type { GainUnit } from "../../../lib/gain";

export type ChartUnit = "money" | "percent";

/** How a chart writes its values, on its axis and in its readout. */
export interface ChartValueFormat {
  unit: ChartUnit;
  /** With `unit: "money"`: `cents` for prices, `euros` for balances. */
  precision: MoneyPrecision;
  /** A sign on every value but zero, for gains: `+4.2%`. */
  signed: boolean;
}

/** A chart of gains: signed, in whole euros or in percent, as the unit setting says. */
export function gainFormat(unit: GainUnit): ChartValueFormat {
  return {
    unit: unit === "eur" ? "money" : "percent",
    precision: "euros",
    signed: true,
  };
}

/**
 * A value as the chart writes it. Anything that names a line's value beside
 * the chart, such as the race's signs, writes it with the same format so it
 * reads like the axis.
 */
export function formatChartValue(
  value: Decimal,
  language: Language,
  { unit, precision, signed }: ChartValueFormat,
): string {
  return unit === "money"
    ? formatMoney(value, language, { precision, signed })
    : formatPercent(value, language, { signed });
}

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

/** A time the chart hands back, in any of its forms, as its day. */
export function dayOf(time: Time): IsoDate {
  if (typeof time === "number") return timeToDay(time);
  if (typeof time === "string") return time;
  const month = String(time.month).padStart(2, "0");
  const day = String(time.day).padStart(2, "0");
  return `${time.year}-${month}-${day}`;
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

/** A line's latest point, where it ends on the chart, or `undefined` for a line with none. */
export function lastPoint({
  points,
}: Pick<ChartLineShape, "points">): ChartPoint | undefined {
  let last: ChartPoint | undefined;
  for (const point of points) {
    if (last === undefined || point.day > last.day) last = point;
  }
  return last;
}

/**
 * The line a pointer at height `y` selects: the nearest one within `reach`
 * pixels, each line given by its height at the pointer's day. `undefined`
 * when none is that close.
 */
export function nearestLine(
  lines: readonly { id: string; y: number }[],
  y: number,
  reach: number,
): string | undefined {
  let nearest: { id: string; distance: number } | undefined;
  for (const line of lines) {
    const distance = Math.abs(line.y - y);
    if (distance <= reach && (!nearest || distance < nearest.distance)) {
      nearest = { id: line.id, distance };
    }
  }
  return nearest?.id;
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
