import type {
  IconWeight,
  IconProps as PhosphorIconProps,
  Icon as PhosphorIconType,
} from "@phosphor-icons/react/lib";
import { cn } from "../../lib/cn";

/** Icon sizes: `s` 16 px in text, `m` 20 px in navigation, `l` 24 px for page actions and state icons. */
const SIZES = {
  s: "size-m",
  m: "size-[1.25rem]",
  l: "size-l",
} as const;

export type IconSize = keyof typeof SIZES;

interface IconOwnProps {
  /** A Phosphor icon, imported from its own module: `@phosphor-icons/react/House`. */
  icon: PhosphorIconType;
  size: IconSize;
  /** `fill` marks the current navigation item. */
  weight?: Extract<IconWeight, "regular" | "fill">;
  /** Names the icon for screen readers. Without it, the icon is hidden from them. */
  label?: string;
}

export type IconProps = IconOwnProps &
  Omit<
    PhosphorIconProps,
    keyof IconOwnProps | "alt" | "color" | "mirrored" | "children"
  >;

/** A Phosphor icon in the current text colour, at one of the icon sizes. */
export function Icon({
  icon: Glyph,
  size,
  weight = "regular",
  label,
  className,
  ...props
}: IconProps) {
  const accessibility = label
    ? { role: "img", "aria-label": label }
    : { "aria-hidden": true };
  return (
    <Glyph
      {...props}
      {...accessibility}
      weight={weight}
      className={cn("shrink-0", SIZES[size], className)}
    />
  );
}
