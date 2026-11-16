import type { Decimal, IsoDate, MemberSeriesPoint, Race } from "@fpr/contracts";
import type { ChartPoint } from "../../../components/molecules/chart/chart";
import type { RaceMember } from "../../../components/organisms/race-card/race-card";
import type { GainUnit } from "../../../lib/gain";
import { lookOf } from "../../../lib/look";

/** A moment's calendar day on the browser's clock, where timestamps are read. */
function localDay(at: string): IsoDate {
  const moment = new Date(at);
  const month = String(moment.getMonth() + 1).padStart(2, "0");
  const day = String(moment.getDate()).padStart(2, "0");
  return `${moment.getFullYear()}-${month}-${day}`;
}

/**
 * A member's points as the chart draws them: one per day, the latest of the
 * day, so today's refreshes end on the newest one. A point with no value in
 * the unit, a percentage from a start at zero, is left out rather than drawn
 * in the other unit.
 */
function dailyPoints(
  points: readonly MemberSeriesPoint[],
  unit: GainUnit,
): ChartPoint[] {
  const byDay = new Map<IsoDate, Decimal>();
  for (const { at, gain } of points) {
    const value = unit === "eur" ? gain.eur : gain.percent;
    if (value != null) byDay.set(localDay(at), value);
  }
  return [...byDay].map(([day, value]) => ({ day, value }));
}

/** The race's members as the race card draws them, in the unit setting. */
export function raceMembers(race: Race, unit: GainUnit): RaceMember[] {
  return race.members.map(({ member, points }) => ({
    id: member.id,
    ...lookOf(member),
    points: dailyPoints(points, unit),
  }));
}
