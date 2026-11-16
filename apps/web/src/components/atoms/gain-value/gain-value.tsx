import type { ComponentProps } from "react";
import { cn } from "../../../lib/cn";
import type { MoneyPrecision } from "../../../lib/format";
import {
  type GainInput,
  type GainTone,
  type GainUnit,
  gainDisplay,
} from "../../../lib/gain";
import { useLanguage } from "../../../lib/i18n";

export interface GainOwnProps {
  /**
   * The gain as the API sends it: `{ eur, percent }`, decimal strings.
   * `percent` is `null` from a start at zero; an anonymous viewer has no `eur`.
   */
  gain: GainInput;
  /**
   * The unit setting, `eur` or `percent`. Without euros (an anonymous viewer)
   * the gain reads in percent; without a percentage, in euros.
   */
  unit: GainUnit;
  /** `cents` (the default) for a holding's gain, `euros` for a balance's. */
  precision?: MoneyPrecision | undefined;
}

/** The part writes its own text: it takes every prop of a `<span>` but `children`. */
export type GainValueProps = GainOwnProps &
  Omit<ComponentProps<"span">, keyof GainOwnProps | "children">;

/** The text colour of each gain tone: green up, red down, grey when it rounds to zero. */
export const GAIN_TONE_TEXT = {
  positive: "text-positive",
  negative: "text-negative",
  flat: "text-secondary",
} as const satisfies Record<GainTone, `text-${string}`>;

/**
 * A gain or a loss, always with its sign (+ or −) as well as its colour: green
 * up, red down, grey when it rounds to zero. It takes the size of its text.
 * Renders nothing with neither euros nor a percentage.
 */
export function GainValue({
  gain,
  unit,
  precision,
  className,
  ...props
}: GainValueProps) {
  const language = useLanguage();

  const shown = gainDisplay(gain, unit, language, { precision });

  return shown === null ? null : (
    <span
      {...props}
      className={cn(
        "font-semibold tabular-nums",
        GAIN_TONE_TEXT[shown.tone],
        className,
      )}
    >
      {shown.text}
    </span>
  );
}
