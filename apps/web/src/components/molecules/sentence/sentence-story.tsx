import type { Decimal, Period } from "@fpr/contracts";
import { Trans, useTranslation } from "react-i18next";
import type { GainInput, GainUnit } from "../../../lib/gain";
import { Chip } from "../../atoms/chip/chip";
import { GainValue } from "../../atoms/gain-value/gain-value";
import {
  TrailSign,
  type TrailSignPerson,
} from "../../atoms/trail-sign/trail-sign";
import { Story, Wide } from "./sentence-parts";

/** The member who leads the race, with their gain over the period. */
export interface SentenceLeader extends TrailSignPerson {
  /** Their gain over the period, as the API sends it: no `eur` for an anonymous viewer. */
  gain: GainInput;
}

/** The share that rose the most over the period among the shares held. */
export interface StarShare {
  /** The share's name. */
  name: string;
  /** Its gain over the period, in percent, as the API sends it (`12.4`). */
  gain: Decimal;
}

/** Where the viewer stands in the race, with what each case needs. */
export type Standing =
  | {
      /** Someone else leads; with every gain down, everyone is down. */
      standing: "theyLead";
      gain: GainInput;
      leader: SentenceLeader;
    }
  | {
      /** You lead; with your gain down, everyone is down. */
      standing: "youLead";
      gain: GainInput;
      leader?: undefined;
    }
  | {
      /** Nobody else has started yet. */
      standing: "alone";
      gain: GainInput;
      leader?: undefined;
    }
  | {
      /** A guest or an anonymous viewer, with no portfolio: the headline names the leader. */
      standing: "watching";
      gain?: undefined;
      leader: SentenceLeader;
    };

/** “Sam leads at +6.1%”: the leader's sign, then their gain in the unit setting. */
function TheyLead({
  leader,
  unit,
}: {
  leader: SentenceLeader;
  unit: GainUnit;
}) {
  return (
    <Trans
      i18nKey="sentence.story.theyLead"
      values={{ name: leader.name }}
      components={{
        sign: <TrailSign person={leader} />,
        gain: <GainValue gain={leader.gain} unit={unit} />,
      }}
    />
  );
}

/** “You lead the race”, on your own sign. */
function YouLead({ you }: { you: TrailSignPerson }) {
  return (
    <Trans
      i18nKey="sentence.story.youLead"
      components={{ sign: <TrailSign person={you} /> }}
    />
  );
}

/** “Everyone is down this month”, from tablet up, then a separator when more follows. */
function EveryoneDown({
  period,
  separated,
}: {
  period: Period;
  separated: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Wide>
      {t("sentence.story.everyoneDown", {
        period: t(`sentence.period.${period}.inline`),
      })}
      {separated ? t("sentence.story.separator") : null}
    </Wide>
  );
}

/** The star share, from tablet up, after what comes before it on the story line or opening it. */
function StarShareLine({
  starShare,
  separated,
  first,
}: {
  starShare: StarShare;
  separated: boolean;
  first: boolean;
}) {
  const { t } = useTranslation();

  return (
    <Wide>
      {separated ? t("sentence.story.separator") : null}
      <Trans
        i18nKey={
          first ? "sentence.story.starShareFirst" : "sentence.story.starShare"
        }
        components={{
          chip: <Chip gain={starShare.gain}>{starShare.name}</Chip>,
        }}
      />
    </Wide>
  );
}

type StoryLineProps = Pick<Standing, "standing" | "leader"> & {
  /** You, drawn on your sign when you lead. */
  you: TrailSignPerson;
  period: Period;
  unit: GainUnit;
  starShare: StarShare | null | undefined;
  /** Whether the gain that leads is down: everyone is. */
  everyoneDown: boolean;
};

/**
 * The story line: “everyone is down” from tablet up, then who leads (the
 * leader's sign, yours, or that you're alone), then the star share from
 * tablet up. Nothing when none of them applies.
 */
export function StoryLine({
  standing,
  leader,
  you,
  period,
  unit,
  starShare,
  everyoneDown,
}: StoryLineProps) {
  const { t } = useTranslation();

  const hasLead = standing !== "watching";
  if (!everyoneDown && !hasLead && !starShare) return null;

  return (
    <Story>
      {everyoneDown ? (
        <EveryoneDown
          period={period}
          separated={hasLead || Boolean(starShare)}
        />
      ) : null}
      {standing === "theyLead" && leader ? (
        <TheyLead leader={leader} unit={unit} />
      ) : null}
      {standing === "youLead" ? <YouLead you={you} /> : null}
      {standing === "alone" ? t("sentence.story.alone") : null}
      {starShare ? (
        <StarShareLine
          starShare={starShare}
          separated={hasLead}
          first={!everyoneDown && !hasLead}
        />
      ) : null}
    </Story>
  );
}
