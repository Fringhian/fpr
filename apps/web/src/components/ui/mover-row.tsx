import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import { type GainInput, type GainUnit, gainDisplay } from "../../lib/gain";
import { useLanguage } from "../../lib/i18n";
import { type MoverScale, moverBar, moverScale } from "../../lib/mover";
import { GainValue } from "./gain-value";

/** One holding's effect on a member's period. */
export interface Mover {
  /** The share's id, which keys the row. */
  id: string;
  /** The share's name. */
  name: string;
  /**
   * The holding's gain over the period, as the API sends it: `{ eur, percent }`.
   * An anonymous viewer has no `eur`; a holding bought during the period has
   * no `percent`.
   */
  gain: GainInput;
}

/** A gain's bar, in the colour of its sign. */
const BAR_TONES = {
  positive: "bg-positive",
  negative: "bg-negative",
} as const;

/** A fraction of the track, as a CSS length. */
function percentOf(fraction: number): string {
  return `${fraction * 100}%`;
}

interface MoverRowOwnProps {
  /** The share's name. */
  name: string;
  /** The holding's gain over the period: `{ eur, percent }`, decimal strings. */
  gain: GainInput;
  /** The unit setting. Without euros (an anonymous viewer) the row reads in percent. */
  unit: GainUnit;
  /** The span of the list's movers, from `moverScale`: the bar is drawn against the biggest. */
  scale: MoverScale;
}

export type MoverRowProps = MoverRowOwnProps &
  Omit<ComponentProps<"li">, keyof MoverRowOwnProps | "children">;

/**
 * One holding's effect on the period: its name, a bar from the zero line, to
 * the right for a gain and to the left for a loss, and the signed gain. The
 * bar is decorative; the sign and the colour say the direction, never the
 * colour alone. It sits in a `MoverList`, which lines its columns up.
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
  const bar = moverBar(gain, unit, scale);
  return (
    <li
      {...props}
      className={cn(
        "col-span-3 grid grid-cols-subgrid items-center text-s",
        className,
      )}
    >
      <span className="truncate">{name}</span>
      <span aria-hidden className="relative h-s">
        {bar === null ? null : (
          <>
            <span
              className="absolute -inset-y-xs w-[0.0625rem] bg-divider"
              style={{ left: percentOf(bar.zero) }}
            />
            {tone === "positive" || tone === "negative" ? (
              <span
                className={cn(
                  "absolute inset-y-0 min-w-s rounded-full",
                  BAR_TONES[tone],
                )}
                style={
                  bar.direction === "gain"
                    ? {
                        left: percentOf(bar.zero),
                        width: percentOf(bar.length),
                      }
                    : {
                        right: percentOf(1 - bar.zero),
                        width: percentOf(bar.length),
                      }
                }
              />
            ) : null}
          </>
        )}
      </span>
      <GainValue
        gain={gain}
        unit={unit}
        precision="euros"
        className="text-end"
      />
    </li>
  );
}

interface MoverListOwnProps {
  /** The holdings that moved the period, biggest effect first. */
  movers: readonly Mover[];
  /** The unit setting, `eur` or `percent`. */
  unit: GainUnit;
}

export type MoverListProps = MoverListOwnProps &
  Omit<ComponentProps<"ul">, keyof MoverListOwnProps | "children">;

/**
 * The holdings that moved a member's period, one `MoverRow` each, in the
 * order given. Every bar is drawn against the biggest mover in the list, on
 * one zero line, and the names, bars and gains line up in columns. Without
 * movers it says nothing has moved yet.
 */
export function MoverList({
  movers,
  unit,
  className,
  ...props
}: MoverListProps) {
  const { t } = useTranslation();
  if (movers.length === 0) {
    return (
      <p className={cn("text-s text-secondary", className)}>
        {t("moverRow.empty")}
      </p>
    );
  }
  const scale = moverScale(
    movers.map((mover) => mover.gain),
    unit,
  );
  return (
    <ul
      {...props}
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_minmax(3rem,35%)_auto] gap-s",
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
