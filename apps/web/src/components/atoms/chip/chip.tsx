import { cva } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../../lib/cn";
import type { Decimal } from "../../../lib/format";
import { GainValue } from "../gain-value/gain-value";

/**
 * The white capsule a chip and a trail sign share. `outline`: `soft`, the
 * divider line of a chip; `strong`, the charcoal outline of a trail sign.
 * `picture`: a picture at the start, nearly touching the edge.
 */
export const capsule = cva(
  "inline-flex items-center gap-[0.375rem] rounded-full bg-surface py-[0.1875rem] text-s font-semibold whitespace-nowrap text-primary",
  {
    variants: {
      outline: {
        soft: "pr-[0.6875rem] shadow-outline",
        strong: "pr-[0.75rem] shadow-[0_0_0_1.5px_var(--color-primary)]",
      },
      picture: { true: "pl-[0.1875rem]", false: "" },
    },
    compoundVariants: [
      { outline: "soft", picture: false, className: "pl-[0.6875rem]" },
      { outline: "strong", picture: false, className: "pl-[0.75rem]" },
    ],
    defaultVariants: { outline: "soft", picture: false },
  },
);

export type ChipProps = {
  /** What the chip names: a share, a person, an ISIN. */
  children: ReactNode;
  /** The person's picture, at 20 px, before their name. */
  picture?: ReactNode;
  /**
   * A gain in percent, as the API sends it (`12.4`, `-1.3`), written after
   * the name with its sign, in green for a gain and red for a loss.
   */
  gain?: Decimal | undefined;
} & Omit<ComponentProps<"span">, "children" | "picture" | "gain">;

/**
 * A white capsule with an outline, for a share or a person mentioned in a
 * sentence: a share's name, optionally with its gain; a person's picture and
 * name; an ISIN. Every other prop goes to the `<span>`, `className` included.
 */
export function Chip({
  children,
  picture,
  gain,
  className,
  ...props
}: ChipProps) {
  return (
    <span
      {...props}
      className={cn(
        capsule({ outline: "soft", picture: Boolean(picture) }),
        className,
      )}
    >
      {picture}
      {children}
      {gain === undefined ? null : (
        <GainValue gain={{ percent: gain }} unit="percent" />
      )}
    </span>
  );
}
