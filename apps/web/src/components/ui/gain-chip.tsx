import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { gainDisplay } from "../../lib/gain";
import { useLanguage } from "../../lib/i18n";
import type { GainProps } from "./gain-value";

export type GainChipProps = GainProps &
  Omit<ComponentProps<"span">, keyof GainProps | "children">;

// The soft grounds mix the tone into the surface, so the chip stays opaque
// and its text keeps its contrast on a card or on the sky alike.
const gainChip = cva(
  "inline-flex shrink-0 items-center rounded-full px-s py-[0.0625rem] text-xs font-semibold whitespace-nowrap tabular-nums",
  {
    variants: {
      tone: {
        positive:
          "bg-[color-mix(in_srgb,var(--color-positive)_12%,var(--color-surface))] text-positive",
        negative:
          "bg-[color-mix(in_srgb,var(--color-negative)_12%,var(--color-surface))] text-negative",
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
  if (shown === null) {
    return null;
  }
  return (
    <span {...props} className={cn(gainChip({ tone: shown.tone }), className)}>
      {shown.text}
    </span>
  );
}
