import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../../lib/cn";
import { gainDisplay } from "../../../lib/gain";
import { useLanguage } from "../../../lib/i18n";
import type { GainOwnProps } from "../gain-value/gain-value";

export type GainChipProps = GainOwnProps &
  Omit<ComponentProps<"span">, keyof GainOwnProps | "children">;

const gainChip = cva(
  "inline-flex shrink-0 items-center rounded-full px-s py-[0.0625rem] text-xs font-semibold whitespace-nowrap tabular-nums",
  {
    variants: {
      tone: {
        positive: "bg-positive-soft text-positive",
        negative: "bg-negative-soft text-negative",
        flat: "bg-highlight text-secondary",
      },
    },
  },
);

/**
 * A gain or a loss on a soft ground of its colour, with its sign: the gain of
 * a holding or a share on its card. Renders nothing with neither euros nor a
 * percentage.
 */
export function GainChip({
  gain,
  unit,
  precision,
  className,
  ...props
}: GainChipProps) {
  const language = useLanguage();

  const shown = gainDisplay(gain, unit, language, { precision });

  return shown === null ? null : (
    <span {...props} className={cn(gainChip({ tone: shown.tone }), className)}>
      {shown.text}
    </span>
  );
}
