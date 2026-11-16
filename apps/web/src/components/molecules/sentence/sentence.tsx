import type { Period } from "@fpr/contracts";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { type GainUnit, gainDisplay } from "../../../lib/gain";
import { useLanguage } from "../../../lib/i18n";
import type { MemberColor } from "../../../lib/member-color";
import { RaceHeadline } from "./sentence-headline";
import { Greeting, Root } from "./sentence-parts";
import { type Standing, type StarShare, StoryLine } from "./sentence-story";
import type { TimeOfDay } from "./time-of-day";

export { hasHeadline } from "./sentence-headline";
export { Greeting, Headline, Root, Story, Wide } from "./sentence-parts";
export type { SentenceLeader, Standing, StarShare } from "./sentence-story";

export type RaceProps = {
  /** The viewer's display name, greeted by it, or an anonymous viewer's pseudonym. */
  name: string;
  /** The viewer's colour, for their picture in “You lead the race”. */
  color: MemberColor;
  /** The viewer's photo's URL, for the same picture. */
  photo?: string | null | undefined;
  /** The part of the day the greeting names; `timeOfDay(new Date())` gives it. */
  timeOfDay: TimeOfDay;
  /** The period the sentence is about, from the period setting. */
  period: Period;
  /** The unit setting: the leader's gain on the story line reads in it. */
  unit: GainUnit;
  /** The star share, after the leader from tablet up. The phone leaves it out. */
  starShare?: StarShare | null | undefined;
} & Standing &
  Omit<
    ComponentProps<"div">,
    | "name"
    | "color"
    | "photo"
    | "timeOfDay"
    | "period"
    | "unit"
    | "starShare"
    | keyof Standing
    | "children"
  >;

/**
 * Home's header sentence, written from the race: a greeting, the viewer's
 * result for the period, and a story line with who leads and the star share.
 * It adapts to where the viewer stands: someone else leads, they lead,
 * everyone is down (read from the gain that leads, theirs or the leader's),
 * they're alone in the race, or they watch as a guest or an anonymous viewer.
 * On phone the story line names the leader only: “everyone is down” and the
 * star share show from tablet up. Every other prop goes to the `<div>`,
 * `className` included.
 */
export function Race({
  name,
  color,
  photo,
  timeOfDay,
  period,
  unit,
  starShare,
  standing,
  gain,
  leader,
  ...props
}: RaceProps) {
  const { t } = useTranslation();
  const language = useLanguage();

  const watching = standing === "watching";
  const leadingGain = standing === "youLead" ? gain : (leader?.gain ?? null);
  const everyoneDown =
    leadingGain !== null &&
    gainDisplay(leadingGain, unit, language)?.tone === "negative";

  return (
    <Root {...props}>
      <Greeting>{t(`sentence.greeting.${timeOfDay}`, { name })}</Greeting>
      <RaceHeadline
        gain={watching ? leader.gain : gain}
        leaderName={watching ? leader.name : null}
        period={period}
        unit={unit}
      />
      <StoryLine
        standing={standing}
        leader={leader}
        you={{ name, color, photo }}
        period={period}
        unit={unit}
        starShare={starShare}
        everyoneDown={everyoneDown}
      />
    </Root>
  );
}
