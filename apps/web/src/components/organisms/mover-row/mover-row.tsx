import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { type UnitScale, unitScale } from "../../../lib/bar-track";
import { cn } from "../../../lib/cn";
import {
  type GainInput,
  type GainUnit,
  gainAmount,
  gainDisplay,
} from "../../../lib/gain";
import { useLanguage } from "../../../lib/i18n";
import { BarTrack } from "../../atoms/bar-track/bar-track";
import { GainValue } from "../../atoms/gain-value/gain-value";

/** One holding's effect on a member's period. */
export interface Mover {
  /** The share's id, which keys the row. */
  id: string;
  name: string;
  /**
   * The holding's gain over the period, as the API sends it: `{ eur, percent }`.
   * An anonymous viewer has no `eur`; a holding bought during the period has
   * no `percent`.
   */
  gain: GainInput;
}

export type MoverRowProps = {
  name: string;
  /** The holding's gain over the period: `{ eur, percent }`, decimal strings. */
  gain: GainInput;
  /** The unit setting. Without euros (an anonymous viewer) the row reads in percent. */
  unit: GainUnit;
  /** The span of the list's movers in each unit, from `unitScale`: the bar is drawn against the biggest mover of the unit it reads in. */
  scale: UnitScale;
} & Omit<ComponentProps<"li">, "name" | "gain" | "unit" | "scale" | "children">;

/**
 * One holding's effect on the period: its name, a bar from the zero line, to
 * the right for a gain and to the left for a loss, and the signed gain. The
 * bar is decorative; the sign and the colour say the direction, never the
 * colour alone. Gains in euros read in whole euros. It sits in a `MoverList`,
 * which lines its columns up.
 */
export function MoverRow({
  name,
  gain,
  unit,
  scale,
  className,
  ...props
}: MoverRowProps) {
  const language = useLanguage();

  const tone = gainDisplay(gain, unit, language, { precision: "euros" })?.tone;
  const shown = gainAmount(gain, unit);
  // A gain that reads as zero draws no bar.
  const signed = tone === "positive" || tone === "negative";

  return (
    <li
      {...props}
      className={cn(
        "col-span-3 grid grid-cols-subgrid items-center text-s",
        className,
      )}
    >
      <span className="truncate">{name}</span>
      <BarTrack
        amount={shown === null ? null : signed ? Number(shown.amount) : 0}
        scale={scale[shown?.unit ?? unit]}
        color={tone === "negative" ? "negative" : "positive"}
        size="s"
      />
      <GainValue
        gain={gain}
        unit={unit}
        precision="euros"
        className="text-end"
      />
    </li>
  );
}

export type MoverListProps = {
  /** The holdings that moved the period, biggest effect first. */
  movers: readonly Mover[];
  unit: GainUnit;
} & Omit<ComponentProps<"ul">, "movers" | "unit" | "children">;

/**
 * The holdings that moved a member's period, one `MoverRow` each, in the
 * order given. Every bar is drawn against the biggest mover in the list, on
 * one zero line, and the names, bars and gains line up in columns. Without
 * movers it says nothing has moved yet, in a paragraph that keeps the
 * list's `id` and `className`.
 */
export function MoverList({
  movers,
  unit,
  id,
  className,
  ...props
}: MoverListProps) {
  const { t } = useTranslation();

  const scale = unitScale(movers.map((mover) => gainAmount(mover.gain, unit)));

  return movers.length === 0 ? (
    <p id={id} className={cn("text-s text-secondary", className)}>
      {t("moverRow.empty")}
    </p>
  ) : (
    <ul
      {...props}
      id={id}
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_minmax(2.5rem,25%)_auto] gap-s",
        className,
      )}
    >
      {movers.map((mover) => (
        <MoverRow
          key={mover.id}
          name={mover.name}
          gain={mover.gain}
          unit={unit}
          scale={scale}
        />
      ))}
    </ul>
  );
}
