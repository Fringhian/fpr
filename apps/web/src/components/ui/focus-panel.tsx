import { type ComponentProps, useId } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import { type GainInput, type GainUnit, gainDisplay } from "../../lib/gain";
import { useLanguage } from "../../lib/i18n";
import type { MemberColor } from "../../lib/member-color";
import type { Period } from "../../lib/period";
import { GainValue } from "./gain-value";
import { type Mover, MoverList } from "./mover-row";
import { Picture } from "./picture";
import { TextLink, type TextLinkProps } from "./text-link";

/** The member the panel shows, as the race and the standings send them. */
export interface FocusMember {
  /** Their display name, or an anonymous viewer's pseudonym. */
  name: string;
  /** Their colour, from `memberColor`. */
  color: MemberColor;
  /** Their photo's URL; `null` for an anonymous viewer. */
  photo?: string | null | undefined;
}

/** “Back to you”: an `href`, or `render` for the router's link, with every prop of a Text link but its text. */
export type FocusPanelLink = Omit<
  TextLinkProps,
  "children" | "toPage" | "toPageIcon"
>;

/** The link to their page: a `FocusPanelLink`, and `toPageIcon`, the icon that ends it (a caret by default). */
export type FocusPanelPageLink = Omit<TextLinkProps, "children" | "toPage">;

export interface FocusPanelOwnProps {
  /** The member the viewer looks at. */
  member: FocusMember;
  /** `true` when the member is the viewer: “Your month”, “What moved you”, and a link to their portfolio. */
  you: boolean;
  /** The period setting, which names the panel's span: “Their month”. */
  period: Period;
  /** The unit setting, `eur` or `percent`. The gain reads in it, with the other unit beside it when the viewer has both. */
  unit: GainUnit;
  /** The member's gain over the period: `{ eur, percent }`. An anonymous viewer has no `eur`. */
  gain: GainInput;
  /** The holdings that moved their period, biggest effect first. Empty, the panel says nothing has moved yet. */
  movers: readonly Mover[];
  /** Their page, or the viewer's portfolio when `you`: an `href` or a `render`, and optionally the `toPageIcon` that ends it. */
  pageLink: FocusPanelPageLink;
  /** “Back to you”, which focuses the viewer again. Shown when another member is focused and the viewer has a portfolio; leave it out for a guest or an anonymous viewer. */
  backLink?: FocusPanelLink | null | undefined;
}

/** Its own props, and every prop of the `<section>` it renders but its content. */
export type FocusPanelProps = FocusPanelOwnProps &
  Omit<ComponentProps<"section">, keyof FocusPanelOwnProps | "children">;

/**
 * The member the viewer looks at on Home, the viewer by default: their
 * picture and name, their gain over the period, the holdings that moved it,
 * and a link to their page. A card that fills the width it is given: a
 * narrow column beside the race on desktop, the full width under it on tablet
 * and phone. Its card rests on an outline; `className="shadow-rest"` lifts it
 * as the first card under the sky.
 */
export function FocusPanel({
  member,
  you,
  period,
  unit,
  gain,
  movers,
  pageLink,
  backLink,
  className,
  ...props
}: FocusPanelProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const nameId = useId();
  const movedId = useId();

  const who = you ? "you" : "them";
  const otherUnit = unit === "eur" ? "percent" : "eur";
  const shown = gainDisplay(gain, unit, language, { precision: "euros" });
  const other = gainDisplay(gain, otherUnit, language, { precision: "euros" });
  const beside = shown !== null && other?.unit !== shown.unit ? other : null;
  const back = you ? null : (backLink ?? null);

  return (
    <section
      aria-labelledby={nameId}
      {...props}
      className={cn(
        "flex min-w-0 flex-col gap-m rounded-l bg-surface p-m shadow-outline",
        className,
      )}
    >
      <header className="flex items-center gap-s">
        <Picture
          name={member.name}
          color={member.color}
          photo={member.photo ?? null}
          size="m"
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <h2 id={nameId} className="truncate text-m font-semibold">
            {member.name}
            {you ? (
              <span className="font-normal text-secondary">
                {" · "}
                {t("focusPanel.you")}
              </span>
            ) : null}
          </h2>
          <p className="text-xs text-secondary">
            {t(`focusPanel.period.${who}.${period}`)}
          </p>
        </div>
        {back === null ? null : (
          <TextLink {...back} className={cn("shrink-0 text-s", back.className)}>
            {t("focusPanel.backToYou")}
          </TextLink>
        )}
      </header>
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
      <div className="flex flex-col gap-s">
        <p id={movedId} className="text-xs font-semibold text-secondary">
          {t(`focusPanel.moved.${who}`)}
        </p>
        <MoverList aria-labelledby={movedId} movers={movers} unit={unit} />
      </div>
      <TextLink
        {...pageLink}
        toPage
        className={cn("self-start text-s", pageLink.className)}
      >
        {you
          ? t("focusPanel.open.you")
          : t("focusPanel.open.them", { name: member.name })}
      </TextLink>
    </section>
  );
}
