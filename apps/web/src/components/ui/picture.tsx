import { Avatar } from "@base-ui/react/avatar";
import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../../lib/cn";
import type { MemberColor } from "../../lib/member-color";

/** The pastel each member colour's picture sits on. */
const PASTELS = {
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
} as const satisfies Record<MemberColor, string>;

const picture = cva(
  "inline-flex shrink-0 select-none items-center justify-center overflow-hidden rounded-full font-semibold text-primary",
  {
    variants: {
      size: {
        xs: "size-[1.25rem] text-[0.5rem] leading-none",
        s: "size-[1.75rem] text-xs leading-none",
        m: "size-[3rem] text-l leading-none",
        l: "size-[5.5rem] text-display leading-none",
      },
      // A 3 px ring, 2 px off the edge, on tablet and desktop only.
      medal: {
        gold: [
          "outline-offset-2 outline-gold",
          "outline-0",
          "tablet:outline-3",
          "desktop:outline-3",
        ],
        silver: [
          "outline-offset-2 outline-silver",
          "outline-0",
          "tablet:outline-3",
          "desktop:outline-3",
        ],
        bronze: [
          "outline-offset-2 outline-bronze",
          "outline-0",
          "tablet:outline-3",
          "desktop:outline-3",
        ],
      },
    },
  },
);

/** `xs` 20 px in chips and signs, `s` 28 px in lists, `m` 48 px in panels, `l` 88 px on a member's page and in onboarding. */
export type PictureSize = "xs" | "s" | "m" | "l";

/** The medal of the first three lanes in the standings. */
export type PictureMedal = "gold" | "silver" | "bronze";

interface PictureOwnProps {
  /** The person's display name, or an anonymous viewer's pseudonym. Its first letter is the initial, and it names the picture for screen readers. */
  name: string;
  /** The person's colour: the picture sits on its pastel. */
  color: MemberColor;
  /** The photo's URL. Without one, or until it loads, or if it fails, the picture is the initial. An anonymous viewer always receives `null`, so they see the pseudonym's initial, never a photo. */
  photo?: string | null;
  /** `xs` 20 px in chips and signs, `s` 28 px in lists, `m` 48 px in panels, `l` 88 px on a member's page and in onboarding. */
  size: PictureSize;
  /** A gold, silver or bronze ring for the first three lanes in the standings, shown on tablet and desktop only. */
  medal?: PictureMedal | null;
}

export type PictureProps = PictureOwnProps &
  Omit<ComponentProps<"span">, keyof PictureOwnProps | "children">;

const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** The name's first letter, as a reader sees it, in capitals. */
export function initialOf(name: string): string {
  const [first] = graphemes.segment(name.trim());
  return first ? first.segment.toLocaleUpperCase() : "";
}

/**
 * A person's picture: their initial on the pastel of their colour, or their
 * photo, in a circle. It is an image named by the person's name; pass
 * `aria-hidden` where the name is written beside it.
 */
export function Picture({
  name,
  color,
  photo,
  size,
  medal,
  className,
  ...props
}: PictureProps) {
  return (
    <Avatar.Root
      role="img"
      aria-label={name}
      {...props}
      className={cn(picture({ size, medal }), PASTELS[color], className)}
    >
      {photo ? (
        <Avatar.Image src={photo} alt="" className="size-full object-cover" />
      ) : null}
      <Avatar.Fallback>{initialOf(name)}</Avatar.Fallback>
    </Avatar.Root>
  );
}
