import type { Id, Period, ShareLeaderboard } from "@fpr/contracts";
import { useTranslation } from "react-i18next";
import * as Sentence from "../../../components/molecules/sentence/sentence";
import { timeOfDay } from "../../../components/molecules/sentence/time-of-day";
import type { GainUnit } from "../../../lib/gain";
import { lookOf } from "../../../lib/look";
import { useSession } from "../../../lib/session/use-session";
import type { GainStandings } from "./use-home-data";

type GainRows = GainStandings["rows"];

/**
 * Where the viewer stands, from the gain standings: alone, leading, behind
 * the leader, or watching the leader when they have no lane, as a guest, an
 * anonymous viewer, or a member not started yet. `null` with nobody in the
 * race.
 */
function standingOf(rows: GainRows, viewerId: Id): Sentence.Standing | null {
  const [first] = rows;
  if (first === undefined) return null;
  const mine = rows.find((row) => row.member.id === viewerId);
  const leader = { ...lookOf(first.member), gain: first.gain };
  if (mine === undefined) return { standing: "watching", leader };
  if (rows.length === 1) return { standing: "alone", gain: mine.gain };
  return mine === first
    ? { standing: "youLead", gain: mine.gain }
    : { standing: "theyLead", gain: mine.gain, leader };
}

/** Whether Home's sentence has a headline, which then is the page's heading. */
export function hasRaceHeadline(rows: GainRows, viewerId: Id): boolean {
  const standing = standingOf(rows, viewerId);
  return standing !== null && Sentence.hasHeadline(standing);
}

/** The greeting alone, while the race loads or before anyone is in it. */
export function HomeGreeting() {
  const { t } = useTranslation();
  const { person } = useSession();

  return (
    <Sentence.Root>
      <Sentence.Greeting>
        {t(`sentence.greeting.${timeOfDay(new Date())}`, {
          name: person.displayName,
        })}
      </Sentence.Greeting>
    </Sentence.Root>
  );
}

/**
 * Home's header sentence, from the gain standings and the shares' ranking:
 * the viewer's result, who leads, and the star share. The greeting alone
 * while nobody is in the race.
 */
export function HomeSentence({
  rows,
  star,
  period,
  unit,
}: {
  rows: GainRows;
  star: ShareLeaderboard["rows"][number] | undefined;
  period: Period;
  unit: GainUnit;
}) {
  const { person } = useSession();

  const standing = standingOf(rows, person.id);
  const starShare = star && {
    name: star.share.name,
    gain: star.change.percent,
  };

  return standing === null ? (
    <HomeGreeting />
  ) : (
    <Sentence.Race
      {...lookOf(person)}
      {...standing}
      timeOfDay={timeOfDay(new Date())}
      period={period}
      unit={unit}
      starShare={starShare}
    />
  );
}
