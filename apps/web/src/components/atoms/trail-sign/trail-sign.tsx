import type { ComponentProps, ReactNode } from "react";
import { cn } from "../../../lib/cn";
import type { MemberColor } from "../../../lib/member-color";
import { capsule } from "../chip/chip";
import { Picture } from "../picture/picture";

/** The person a sign names, drawn as their picture before the words. */
export interface TrailSignPerson {
  /** The display name, or an anonymous viewer's pseudonym: the picture's initial. */
  name: string;
  color: MemberColor;
  /** The photo's URL; without one, the picture is the initial. */
  photo?: string | null | undefined;
}

export type TrailSignProps = {
  /** What the sign says: “Sam leads”, “You +4.2%”, “€12,374”. A sign given to `Trans` as a component takes its words from the translation. */
  children?: ReactNode;
  /** The person the sign names: their picture, at 20 px, before the words. Without one, the sign is words alone. */
  person?: TrailSignPerson | undefined;
} & Omit<ComponentProps<"span">, "children">;

/**
 * The signature: a white capsule with a charcoal outline that names the
 * leader and you, in sentences and at the end of your lines in the race. At
 * most two signs on a chart: the focused member and you. Every other prop
 * goes to the `<span>`, `className` included.
 */
export function TrailSign({
  children,
  person,
  className,
  ...props
}: TrailSignProps) {
  return (
    <span
      {...props}
      className={cn(
        capsule({ outline: "strong", picture: person !== undefined }),
        className,
      )}
    >
      {person ? (
        <Picture
          aria-hidden
          name={person.name}
          color={person.color}
          photo={person.photo ?? null}
          size="xs"
        />
      ) : null}
      {children}
    </span>
  );
}
