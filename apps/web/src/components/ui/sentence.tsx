import type { ComponentProps, ReactNode } from "react";
import { Trans, useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import { type Decimal, formatMoney, formatPercent } from "../../lib/format";
import {
  type GainInput,
  type GainTone,
  type GainUnit,
  gainDisplay,
} from "../../lib/gain";
import { useLanguage } from "../../lib/i18n";
import type { Language } from "../../lib/language";
import type { MemberColor } from "../../lib/member-color";
import type { TimeOfDay } from "../../lib/time-of-day";
import { Chip } from "./chip";
import { GainValue } from "./gain-value";
import { Picture } from "./picture";
import { TrailSign } from "./trail-sign";

/**
 * The header sentence's block: the greeting, the headline, then the story
 * line. It goes in `Sky.Header`, after the page bar.
 */
export function Root(props: ComponentProps<"div">) {
  return <div {...props} />;
}

/** The greeting, in the sky's ink: “Good evening, Alex”. */
export function Greeting({ className, ...props }: ComponentProps<"p">) {
  return <p {...props} className={cn("text-m text-on-sky", className)} />;
}

/**
 * The headline, the page's heading: display size on tablet and desktop,
 * headline size on phone.
 */
export function Headline({ className, ...props }: ComponentProps<"h1">) {
  return (
    <h1
      {...props}
      className={cn(
        "mt-xs font-semibold text-balance text-primary",
        "text-xl",
        "tablet:text-display",
        "desktop:text-display",
        className,
      )}
    />
  );
}

/**
 * The story line, with room for trail signs and chips: its lines are 1.8
 * times its text apart, so signs on two lines never touch.
 */
export function Story({ className, ...props }: ComponentProps<"p">) {
  return (
    <p
      {...props}
      className={cn("mt-s text-m leading-[1.8] text-primary", className)}
    />
  );
}

/** A part of the story line shown from tablet up: the phone keeps the leader only. */
export function Wide({ className, ...props }: ComponentProps<"span">) {
  return (
    <span
      {...props}
      className={cn("", "hidden", "tablet:inline", "desktop:inline", className)}
    />
  );
}

/** The race's periods, as `@fpr/contracts` names them. */
export type Period = "1D" | "1W" | "1M" | "3M" | "YTD" | "all";

/** A person the sentence draws with their picture. */
export interface SentencePerson {
  /** The display name, or an anonymous viewer's pseudonym. */
  name: string;
  /** Their member colour, which their picture sits on. */
  color: MemberColor;
  /** Their photo's URL; without one, the picture is their initial. */
  photo?: string | null | undefined;
}

/** The member who leads the race, with their gain over the period. */
export interface SentenceLeader extends SentencePerson {
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

interface RaceOwnProps {
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
}

export type RaceProps = RaceOwnProps &
  Standing &
  Omit<ComponentProps<"div">, keyof RaceOwnProps | keyof Standing | "children">;

const TONE_TEXT = {
  positive: "text-positive",
  negative: "text-negative",
  flat: "text-secondary",
} as const satisfies Record<GainTone, string>;

const HEADLINE_KEY = {
  positive: "up",
  negative: "down",
  flat: "flat",
} as const satisfies Record<GainTone, string>;

/**
 * A gain written for the headline, in whole euros then in percent:
 * `€512 (+4.2%)`. Unsigned euros read after “up” or “down”; signed ones
 * after a leader's name. Either part alone when the other is missing.
 */
function headlineAmount(
  gain: GainInput,
  language: Language,
  signed: boolean,
): string | null {
  const eur = gain.eur ?? null;
  const money =
    eur === null
      ? null
      : formatMoney(signed ? eur : eur.replace(/^-/, ""), language, {
          precision: "euros",
          signed,
        });
  const percent =
    gain.percent === null
      ? null
      : formatPercent(gain.percent, language, { signed: true });
  if (money !== null && percent !== null) {
    return `${money} (${percent})`;
  }
  return money ?? percent;
}

function SignPicture({ person }: { person: SentencePerson }) {
  return (
    <Picture
      name={person.name}
      color={person.color}
      photo={person.photo ?? null}
      size="xs"
      aria-hidden
    />
  );
}

/**
 * Home's header sentence, written from the race: a greeting, your result for
 * the period, and a story line with who leads and the star share. It adapts
 * to where you stand: someone else leads, you lead, everyone is down (read
 * from the leader's gain), you're alone in the race, or you watch as a guest
 * or an anonymous viewer. On phone the story line names the leader only:
 * “everyone is down” and the star share show from tablet up.
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
  const periodStart = t(`sentence.period.${period}.start`);
  const periodInline = t(`sentence.period.${period}.inline`);

  // Your gain, or the leader's for a viewer without a portfolio.
  const watching = standing === "watching";
  const headlineGain = watching ? leader.gain : gain;
  const tone = gainDisplay(headlineGain, unit, language)?.tone ?? null;
  const amount = headlineAmount(headlineGain, language, watching);

  // The gain that leads: yours when you lead, the leader's when someone else
  // does. Nobody leads a race you're alone in.
  let leadTone: GainTone | null = null;
  if (standing === "youLead") {
    leadTone = tone;
  } else if (standing === "theyLead" || standing === "watching") {
    leadTone = gainDisplay(leader.gain, unit, language)?.tone ?? null;
  }
  const everyoneDown = leadTone === "negative";

  let headline: ReactNode = null;
  if (amount !== null && tone !== null) {
    const amountText = <span className={TONE_TEXT[tone]} />;
    headline =
      standing === "watching" ? (
        <Trans
          i18nKey="sentence.headline.leader"
          values={{ period: periodStart, name: leader.name, amount }}
          components={{ gain: amountText }}
        />
      ) : (
        <Trans
          i18nKey={`sentence.headline.${HEADLINE_KEY[tone]}`}
          values={{ period: periodStart, amount }}
          components={{ gain: amountText }}
        />
      );
  }

  // The story line: who leads, the one part the phone keeps, between “everyone
  // is down” and the star share, which show from tablet up.
  const separator = t("sentence.story.separator");
  const mood = everyoneDown
    ? t("sentence.story.everyoneDown", { period: periodInline })
    : null;
  let lead: ReactNode = null;
  if (standing === "theyLead") {
    lead = (
      <Trans
        i18nKey="sentence.story.theyLead"
        values={{ name: leader.name }}
        components={{
          sign: (
            <TrailSign picture={<SignPicture person={leader} />}>
              {null}
            </TrailSign>
          ),
          gain: <GainValue gain={leader.gain} unit={unit} />,
        }}
      />
    );
  } else if (standing === "youLead") {
    lead = (
      <Trans
        i18nKey="sentence.story.youLead"
        components={{
          sign: (
            <TrailSign
              picture={<SignPicture person={{ name, color, photo }} />}
            >
              {null}
            </TrailSign>
          ),
        }}
      />
    );
  } else if (standing === "alone") {
    lead = t("sentence.story.alone");
  }

  const star = starShare ? (
    <Trans
      i18nKey={
        mood === null && lead === null
          ? "sentence.story.starShareFirst"
          : "sentence.story.starShare"
      }
      components={{ chip: <Chip gain={starShare.gain}>{starShare.name}</Chip> }}
    />
  ) : null;

  return (
    <Root {...props}>
      <Greeting>{t(`sentence.greeting.${timeOfDay}`, { name })}</Greeting>
      {headline === null ? null : <Headline>{headline}</Headline>}
      {mood === null && lead === null && star === null ? null : (
        <Story>
          {mood === null ? null : (
            <Wide>
              {mood}
              {lead === null && star === null ? null : separator}
            </Wide>
          )}
          {lead}
          {star === null ? null : (
            <Wide>
              {lead === null ? null : separator}
              {star}
            </Wide>
          )}
        </Story>
      )}
    </Root>
  );
}
