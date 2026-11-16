import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { type BarScale, barGeometry } from "../../../lib/bar-track";
import { cn } from "../../../lib/cn";
import { MEMBER_FILLS, type MemberColor } from "../../../lib/member-color";

/** A bar's colour: a member's, or the colour of a gain's sign. */
export type BarTrackColor = MemberColor | "positive" | "negative";

const BAR_COLORS = {
  ...MEMBER_FILLS,
  positive: "bg-positive",
  negative: "bg-negative",
} as const satisfies Record<BarTrackColor, `bg-${string}`>;

const track = cva("relative block", {
  variants: {
    size: {
      s: "h-s",
      m: "h-[0.875rem]",
    },
  },
  defaultVariants: { size: "m" },
});

export interface BarTrackOwnProps {
  /** The amount the bar draws: right of the zero line above zero, left of it below. `null` draws only the zero line. */
  amount: number | null;
  /**
   * The lowest and highest amounts of every track drawn side by side, from
   * `barScale`, or from `unitScale` in the amount's unit, so their zero lines
   * line up and their lengths compare.
   */
  scale: BarScale;
  /** The bar's colour: a member's colour, or `positive` / `negative` for a gain's sign. */
  color: BarTrackColor;
  /** The track's height: `s` in a mover row, `m` in a lane. */
  size?: "s" | "m" | undefined;
}

/** Its own props, and every prop of the `<span>` it renders but its content. */
export type BarTrackProps = BarTrackOwnProps &
  Omit<ComponentProps<"span">, keyof BarTrackOwnProps | "children">;

/**
 * A bar from a zero line: rightwards for a gain, leftwards for a loss, its
 * length relative to the scale it shares with the tracks beside it. Any
 * amount other than zero draws at least a short bar. When the amount or the
 * scale changes, the bar eases to its new length; with reduced motion, it
 * moves at once. Decorative: hidden from assistive technology, so the figure
 * beside it says the value.
 */
export function BarTrack({
  amount,
  scale,
  color,
  size,
  className,
  ...props
}: BarTrackProps) {
  const bar = barGeometry(amount, scale);
  const drawn = bar.length > 0;

  return (
    <span aria-hidden {...props} className={cn(track({ size }), className)}>
      <span
        className="absolute -inset-y-xs w-[0.0625rem] bg-muted"
        style={{ left: `${bar.zero}%` }}
      />
      {/* Always drawn, so a bar grows from or shrinks to nothing when the amount changes. */}
      <span
        className={cn(
          "absolute inset-y-0 rounded-full transition-[left,right,width] duration-l ease-soft",
          "",
          "",
          "",
          "motion-reduce:transition-none",
          BAR_COLORS[color],
          drawn ? "min-w-s" : "",
        )}
        style={
          bar.direction === "gain"
            ? { left: `${bar.zero}%`, width: `${bar.length}%` }
            : { right: `${100 - bar.zero}%`, width: `${bar.length}%` }
        }
      />
    </span>
  );
}
