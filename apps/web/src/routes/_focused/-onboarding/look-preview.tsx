import type { Person } from "@fpr/contracts";
import { useTranslation } from "react-i18next";
import { Card } from "../../../components/atoms/card/card";
import { Picture } from "../../../components/atoms/picture/picture";
import * as Lane from "../../../components/molecules/lane/lane";
import { cn } from "../../../lib/cn";
import type { LaneValue } from "../../../lib/lane";
import { type MemberColor, memberColor } from "../../../lib/member-color";

/** How the person shows: their name, colour, and photo as chosen so far. */
export type Look = {
  name: string;
  color: MemberColor;
  photo: string | null;
};

/** The look the person has saved. */
export function lookOf(person: Person): Look {
  return {
    name: person.displayName,
    color: memberColor(person.color),
    photo: person.avatarUrl,
  };
}

const startingValue: LaneValue = {
  board: "gain",
  gain: { eur: "0", percent: "0" },
  unit: "percent",
};

/**
 * The person's lane as the others will see it, before anything moved: their
 * picture, their name, and a gain of zero. It is a picture of a lane, so it
 * opens nothing.
 */
function LaneSample({ look }: { look: Look }) {
  return (
    <Card className="w-full max-w-[27.5rem] p-xs">
      <Lane.Root disabled className="bg-highlight">
        <Lane.Row
          className={cn("cursor-default", "", "", "", "hover:bg-transparent")}
        >
          <Picture
            name={look.name}
            color={look.color}
            photo={look.photo}
            size="s"
            aria-hidden
          />
          <Lane.Name name={look.name} you />
          <Lane.Bar value={startingValue} color={look.color} />
          <Lane.Figure value={startingValue} />
        </Lane.Row>
      </Lane.Root>
    </Card>
  );
}

/** “How the others see you” over what follows it. */
function Caption({ className }: { className?: string }) {
  const { t } = useTranslation();

  return (
    <p className={cn("text-s text-secondary", className)}>
      {t("onboarding.preview")}
    </p>
  );
}

/** The sky panel of the name and look steps: the picture, then the lane, updating as the person types and picks. */
export function LookPanel({ look }: { look: Look }) {
  return (
    <>
      <Caption className="text-on-sky" />
      <Picture
        name={look.name}
        color={look.color}
        photo={look.photo}
        size="l"
        aria-hidden
      />
      <LaneSample look={look} />
    </>
  );
}

/** The lane under the colours on tablet, where the desktop shows it on the sky. */
export function LookTeaser({ look }: { look: Look }) {
  return (
    <div
      className={cn(
        "flex-col gap-s",
        "hidden",
        "tablet:flex",
        "desktop:hidden",
      )}
    >
      <Caption />
      <LaneSample look={look} />
    </div>
  );
}
