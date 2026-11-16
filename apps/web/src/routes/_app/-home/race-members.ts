import type { Race } from "@fpr/contracts";
import type { RaceMember } from "../../../components/organisms/race-card/race-card";
import type { GainUnit } from "../../../lib/gain";
import { lookOf } from "../../../lib/look";
import { gainPoints } from "../../../lib/series";

/** The race's members as the race card draws them, in the unit setting. */
export function raceMembers(race: Race, unit: GainUnit): RaceMember[] {
  return race.members.map(({ member, points }) => ({
    id: member.id,
    ...lookOf(member),
    points: gainPoints(points, unit),
  }));
}
