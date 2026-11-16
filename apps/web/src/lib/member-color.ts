import { colorCount } from "@fpr/contracts/values";

/**
 * The member colours, `colorCount` of them, in order: colour 1 is
 * `vermilion`, colour 10 is `periwinkle`. Each is a token in `theme.css`,
 * with its `-pastel`.
 */
export const MEMBER_COLORS = [
  "vermilion",
  "cobalt",
  "green",
  "violet",
  "amber",
  "pink",
  "cyan",
  "lime",
  "sienna",
  "periwinkle",
] as const satisfies { length: typeof colorCount };

export type MemberColor = (typeof MEMBER_COLORS)[number];

// Each map below writes its classes out whole, so Tailwind generates them.

/** Each member colour's fill: a line, a bar, a swatch. */
export const MEMBER_FILLS = {
  vermilion: "bg-vermilion",
  cobalt: "bg-cobalt",
  green: "bg-green",
  violet: "bg-violet",
  amber: "bg-amber",
  pink: "bg-pink",
  cyan: "bg-cyan",
  lime: "bg-lime",
  sienna: "bg-sienna",
  periwinkle: "bg-periwinkle",
} as const satisfies Record<MemberColor, `bg-${string}`>;

/** Each member colour's pastel, the ground a picture sits on. */
export const MEMBER_PASTELS = {
  vermilion: "bg-vermilion-pastel",
  cobalt: "bg-cobalt-pastel",
  green: "bg-green-pastel",
  violet: "bg-violet-pastel",
  amber: "bg-amber-pastel",
  pink: "bg-pink-pastel",
  cyan: "bg-cyan-pastel",
  lime: "bg-lime-pastel",
  sienna: "bg-sienna-pastel",
  periwinkle: "bg-periwinkle-pastel",
} as const satisfies Record<MemberColor, `bg-${string}-pastel`>;

/** Each member colour as `--tone`, for the parts inside to mix with the surface. */
export const MEMBER_TONES = {
  vermilion: "[--tone:var(--color-vermilion)]",
  cobalt: "[--tone:var(--color-cobalt)]",
  green: "[--tone:var(--color-green)]",
  violet: "[--tone:var(--color-violet)]",
  amber: "[--tone:var(--color-amber)]",
  pink: "[--tone:var(--color-pink)]",
  cyan: "[--tone:var(--color-cyan)]",
  lime: "[--tone:var(--color-lime)]",
  sienna: "[--tone:var(--color-sienna)]",
  periwinkle: "[--tone:var(--color-periwinkle)]",
} as const satisfies Record<MemberColor, `[--tone:${string}]`>;

/**
 * The member colour the API's `color`, from 1 to `colorCount`, names.
 * Anything else throws a `RangeError`.
 */
export function memberColor(color: number): MemberColor {
  const name = Number.isInteger(color) ? MEMBER_COLORS[color - 1] : undefined;
  if (name === undefined) {
    throw new RangeError(
      `A member colour is from 1 to ${colorCount}, not ${color}`,
    );
  }
  return name;
}
