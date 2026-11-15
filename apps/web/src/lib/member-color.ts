/**
 * The ten member colours, in order: colour 1 is `vermilion`, colour 10 is
 * `periwinkle`. Each is a token in `theme.css`, with its `-pastel`.
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
] as const;

export type MemberColor = (typeof MEMBER_COLORS)[number];

/** Each member colour's fill class, written out whole so Tailwind generates it. */
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

/**
 * The member colour the API's `color`, from 1 to 10, names. Anything else
 * throws a `RangeError`.
 */
export function memberColor(color: number): MemberColor {
  const name = Number.isInteger(color) ? MEMBER_COLORS[color - 1] : undefined;
  if (name === undefined) {
    throw new RangeError(`A member colour is from 1 to 10, not ${color}`);
  }
  return name;
}
