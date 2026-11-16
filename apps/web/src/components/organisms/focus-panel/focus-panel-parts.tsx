import type { Period } from "@fpr/contracts";
import { type ComponentProps, useId } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { type GainInput, type GainUnit, gainDisplay } from "../../../lib/gain";
import { useLanguage } from "../../../lib/i18n";
import type { MemberColor } from "../../../lib/member-color";
import { Card } from "../../atoms/card/card";
import { GainValue } from "../../atoms/gain-value/gain-value";
import { Picture } from "../../atoms/picture/picture";
import { TextLink, type TextLinkProps } from "../../atoms/text-link/text-link";
import { YouSuffix } from "../../molecules/lane/lane";
import { type Mover, MoverList } from "../mover-row/mover-row";

/** The member the panel shows, as the race and the standings send them. */
export interface Member {
  /** Their display name, or an anonymous viewer's pseudonym. */
  name: string;
  /** Their colour, from `memberColor`. */
  color: MemberColor;
  /** Their photo's URL; `null` for an anonymous viewer. */
  photo?: string | null | undefined;
}

/** “Back to you”: an `href`, or `render` for the router's link, with every prop of a Text link but its text. */
export type BackLinkProps = Omit<
  TextLinkProps,
  "children" | "toPage" | "toPageIcon"
>;

/** The link to the member's page: every prop of a Text link, ended by `toPageIcon`, a caret by default. */
export type PageLinkProps = Omit<TextLinkProps, "toPage">;

/** The card, a `<section>`. Name it with `aria-labelledby`, the `Header`'s `titleId`. */
export function Root({ className, ...props }: ComponentProps<"section">) {
  return (
    <Card
      render={<section />}
      {...props}
      className={cn("flex min-w-0 flex-col gap-m p-m", className)}
    />
  );
}

/** The member's picture and name, the span of the period, and “Back to you” when `backLink` is given. */
export function Header({
  titleId,
  member,
  you,
  period,
  backLink,
}: {
  titleId: string;
  member: Member;
  you: boolean;
  period: Period;
  backLink?: BackLinkProps | null | undefined;
}) {
  const { t } = useTranslation();

  return (
    <header className="flex items-center gap-s">
      <Picture
        name={member.name}
        color={member.color}
        photo={member.photo ?? null}
        size="m"
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <h2 id={titleId} className="truncate text-m font-semibold">
          {member.name}
          {you ? <YouSuffix /> : null}
        </h2>
        <p className="text-xs text-secondary">
          {t(`focusPanel.period.${you ? "you" : "them"}.${period}`)}
        </p>
      </div>
      {backLink == null ? null : (
        <TextLink
          {...backLink}
          className={cn("shrink-0 text-s", backLink.className)}
        >
          {t("focusPanel.backToYou")}
        </TextLink>
      )}
    </header>
  );
}

/** The gain in the unit setting, with the other unit beside it when the viewer has both. */
export function Gain({ gain, unit }: { gain: GainInput; unit: GainUnit }) {
  const language = useLanguage();

  const otherUnit = unit === "eur" ? "percent" : "eur";
  const shown = gainDisplay(gain, unit, language, { precision: "euros" });
  const other = gainDisplay(gain, otherUnit, language, { precision: "euros" });
  const beside = shown !== null && other?.unit !== shown.unit ? other : null;

  return (
    <p className="flex flex-wrap items-baseline gap-x-s">
      <GainValue
        gain={gain}
        unit={unit}
        precision="euros"
        className="text-xl"
      />
      {beside === null ? null : (
        <span className="text-s text-secondary tabular-nums">
          {beside.text}
        </span>
      )}
    </p>
  );
}

/** “What moved them”, or “What moved you”, and the holdings that moved the period. */
export function Movers({
  you,
  movers,
  unit,
}: {
  you: boolean;
  movers: readonly Mover[];
  unit: GainUnit;
}) {
  const { t } = useTranslation();
  const movedId = useId();

  return (
    <div className="flex flex-col gap-s">
      <p id={movedId} className="text-xs font-semibold text-secondary">
        {t(`focusPanel.moved.${you ? "you" : "them"}`)}
      </p>
      <MoverList aria-labelledby={movedId} movers={movers} unit={unit} />
    </div>
  );
}

/** The link to the member's page, at the panel's foot. */
export function PageLink({ className, ...props }: PageLinkProps) {
  return (
    <TextLink
      {...props}
      toPage
      className={cn("self-start text-s", className)}
    />
  );
}
