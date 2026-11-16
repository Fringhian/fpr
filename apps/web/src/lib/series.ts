import type {
  Decimal,
  IsoDate,
  MemberSeriesPoint,
  PricePoint,
} from "@fpr/contracts";
import type { ChartPoint } from "../components/molecules/chart/chart";
import type { GainUnit } from "./gain";

/** A moment's calendar day on the browser's clock, where timestamps are read. */
function localDay(at: string): IsoDate {
  const moment = new Date(at);
  const month = String(moment.getMonth() + 1).padStart(2, "0");
  const day = String(moment.getDate()).padStart(2, "0");
  return `${moment.getFullYear()}-${month}-${day}`;
}

/** One value per day, the latest of the day, so today's refreshes end on the newest one. */
function byDay<T>(
  points: readonly T[],
  read: (point: T) => { at: string; value: Decimal | null | undefined },
): ChartPoint[] {
  const days = new Map<IsoDate, Decimal>();
  for (const point of points) {
    const { at, value } = read(point);
    if (value != null) days.set(localDay(at), value);
  }
  return [...days].map(([day, value]) => ({ day, value }));
}

/**
 * A member's gain as a chart draws it, one point per day in the unit. A point
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

/** A share's price as a chart draws it, one point per day. */
export function pricePoints(points: readonly PricePoint[]): ChartPoint[] {
  return byDay(points, ({ at, priceEur }) => ({ at, value: priceEur }));
}

/** The day of the series' last close: the points after it are today's, not final. */
export function lastCloseOf(
  points: readonly MemberSeriesPoint[],
): IsoDate | undefined {
  const close = points.findLast((point) => !point.provisional);
  return close === undefined ? undefined : localDay(close.at);
}
