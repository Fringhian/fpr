import type {
  Decimal,
  IsoDate,
  MemberSeriesPoint,
  PricePoint,
} from "@fpr/contracts";
import type { ChartPoint } from "../components/molecules/chart/chart";
import type { GainUnit } from "./gain";
import { raceDayOf } from "./race-day";

function byDay<T>(
  points: readonly T[],
  read: (point: T) => { at: string; value: Decimal | null | undefined },
): ChartPoint[] {
  const days = new Map<IsoDate, Decimal>();
  for (const point of points) {
    const { at, value } = read(point);
    if (value != null) days.set(raceDayOf(at), value);
  }
  return [...days].map(([day, value]) => ({ day, value }));
}

/**
 * A member's gain as a chart draws it, one point per race day in the unit:
 * the day's latest, so today's refreshes end on the newest one. A point
 * with no value in the unit, a percentage from a start at zero, is left out
 * rather than drawn in the other unit.
 */
export function gainPoints(
  points: readonly MemberSeriesPoint[],
  unit: GainUnit,
): ChartPoint[] {
  return byDay(points, ({ at, gain }) => ({
    at,
    value: unit === "eur" ? gain.eur : gain.percent,
  }));
}

/** A share's price as a chart draws it, the latest of each race day. */
export function pricePoints(points: readonly PricePoint[]): ChartPoint[] {
  return byDay(points, ({ at, priceEur }) => ({ at, value: priceEur }));
}

/**
 * The day of the series' last close, as the API's `lastCloseOn` names it for
 * a response without one: the points after it are today's, not final.
 */
export function lastCloseOf(
  points: readonly MemberSeriesPoint[],
): IsoDate | undefined {
  const close = points.findLast((point) => !point.provisional);
  return close === undefined ? undefined : raceDayOf(close.at);
}
