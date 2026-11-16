import { Avatar } from "@base-ui/react/avatar";
import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn, stateClassName } from "../../../lib/cn";
import { useLanguage } from "../../../lib/i18n";
import { initialOf } from "../../../lib/initial";
import { MEMBER_PASTELS, type MemberColor } from "../../../lib/member-color";

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

export type PictureSize = "xs" | "s" | "m" | "l";

export type PictureMedal = "gold" | "silver" | "bronze";

export type PictureProps = {
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
} & Omit<
  ComponentProps<typeof Avatar.Root>,
  "name" | "color" | "photo" | "size" | "medal" | "children"
>;

/**
 * A person's picture: their initial on the pastel of their colour, or their
 * photo, in a circle. It is an image named by the person's name; pass
 * `aria-hidden` where the name is written beside it. Every other prop goes to
 * Base UI's avatar, `className` included: a string, or a function of its
 * state.
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
  const language = useLanguage();

  const classes = cn(picture({ size, medal }), MEMBER_PASTELS[color]);
  const initial = initialOf(name, language);

  return (
    <Avatar.Root
      role="img"
      aria-label={name}
      {...props}
      className={stateClassName(classes, className)}
    >
      {photo ? (
        <Avatar.Image src={photo} alt="" className="size-full object-cover" />
      ) : null}
      <Avatar.Fallback>{initial}</Avatar.Fallback>
    </Avatar.Root>
  );
}
