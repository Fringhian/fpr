import { Button as BaseButton } from "@base-ui/react/button";
import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import { Icon, type IconProps } from "./icon";

const iconButton = cva(
  [
    "inline-flex shrink-0 cursor-pointer items-center justify-center rounded-full text-secondary",
    "",
    "",
    "",
    "not-disabled:hover:bg-highlight not-disabled:hover:text-primary",
    "focus-visible:focus-ring",
    "disabled:cursor-not-allowed disabled:opacity-[0.45]",
  ],
  {
    variants: {
      size: { s: "size-l", m: "size-xl" },
      ring: { false: "bg-transparent", true: "bg-surface shadow-outline" },
    },
    defaultVariants: { size: "m", ring: false },
  },
);

/** The icon’s size in each button size: 16px in a 24px button, 20px in a 40px one. */
const ICON_SIZES = { s: "s", m: "m" } as const;

export interface IconButtonOwnProps {
  /** Any Phosphor icon, imported from its own module: `icon={XIcon}`. */
  icon: IconProps["icon"];
  /** Names the action for screen readers, such as “Close” or “More actions”. Required: the icon alone says nothing to them. */
  label: string;
  /** Draws a white disc with an outline behind the icon, for a button over a picture or the sky. */
  ring?: boolean;
  /** `m` 40px, the default; `s` 24px, beside a line of text, such as the info icon next to an idea that needs a sentence. */
  size?: "s" | "m";
}

export type IconButtonProps = IconButtonOwnProps &
  Omit<
    ComponentProps<typeof BaseButton>,
    keyof IconButtonOwnProps | "children" | "aria-label" | "aria-labelledby"
  >;

/**
 * A round button holding one icon, on Base UI’s button, named by its label.
 * Every other prop goes to Base UI’s button, `className` included: a string,
 * or a function of the button’s state.
 */
export function IconButton({
  icon,
  label,
  ring = false,
  size = "m",
  className,
  ...props
}: IconButtonProps) {
  const classes = iconButton({ size, ring });

  return (
    <BaseButton
      {...props}
      aria-label={label}
      className={(state) =>
        cn(
          classes,
          typeof className === "function" ? className(state) : className,
        )
      }
    >
      <Icon icon={icon} size={ICON_SIZES[size]} />
    </BaseButton>
  );
}
