import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge, fromTheme } from "tailwind-merge";

const SIZES = ["xs", "s", "m", "l", "xl"];

/**
 * tailwind-merge, taught the scales `theme.css` registers, so it sorts
 * `text-s` (a size) from `text-secondary` (a colour), and reads `rounded-s`
 * and `rounded-l` as the radius tokens, not the start and left corners.
 */
const twMerge = extendTailwindMerge({
  override: {
    theme: {
      spacing: ["0", ...SIZES],
      text: [...SIZES, "display"],
      radius: ["s", "m", "card", "l", "xl"],
      shadow: ["outline", "rest", "float"],
      "inset-shadow": ["outline"],
      breakpoint: ["tablet", "desktop"],
    },
    classGroups: {
      "rounded-s": [{ "rounded-s": ["none", "full", fromTheme("radius")] }],
      "rounded-l": [{ "rounded-l": ["none", "full", fromTheme("radius")] }],
    },
  },
});

/**
 * Joins class lists and resolves Tailwind conflicts, the last class winning.
 * Classes are split into groups: common, phone, `tablet:`, `desktop:`, then
 * one group per state (the `fpr-ui` skill, Readable classes).
 */
export function cn(...groups: ClassValue[]): string {
  return twMerge(clsx(groups));
}

/**
 * The `className` of a Base UI part: its own classes, then the caller's,
 * which is a string or a function of the part's state, so the caller's win.
 * `className={stateClassName(classes, className)}`.
 */
export function stateClassName<State>(
  classes: ClassValue,
  className: string | ((state: State) => string | undefined) | undefined,
): (state: State) => string {
  return (state) =>
    cn(classes, typeof className === "function" ? className(state) : className);
}
