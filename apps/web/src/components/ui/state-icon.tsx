import type { Icon as PhosphorIconType } from "@phosphor-icons/react/lib";
import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { Icon } from "./icon";

const circle = cva(
  "inline-flex shrink-0 items-center justify-center rounded-full bg-highlight text-on-sky",
  {
    variants: {
      size: {
        m: "size-xl",
        l: "size-[3.5rem]",
      } satisfies Record<StateIconSize, string>,
    },
    defaultVariants: { size: "l" },
  },
);

/** `l` 56 px, over a state; `m` 40 px, beside a line of text. */
export type StateIconSize = "m" | "l";

interface StateIconOwnProps {
  /** A Phosphor icon, imported from its own module: `@phosphor-icons/react/Tray`. */
  icon: PhosphorIconType;
  /** `l` (the default) 56 px, over an empty, waiting or error state; `m` 40 px, beside a line of text. */
  size?: StateIconSize;
  /** Names the icon for screen readers. Without it, the circle is hidden from them, as beside a title that says the same. */
  label?: string;
}

export type StateIconProps = StateIconOwnProps &
  Omit<ComponentProps<"span">, keyof StateIconOwnProps | "children">;

/**
 * An icon in a soft blush circle, over an empty, waiting, offline or error
 * state: the tray when nothing is there yet, the wifi slash offline.
 */
export function StateIcon({
  icon,
  size = "l",
  label,
  className,
  ...props
}: StateIconProps) {
  return (
    <span {...props} className={cn(circle({ size }), className)}>
      <Icon icon={icon} size={size} {...(label ? { label } : {})} />
    </span>
  );
}
