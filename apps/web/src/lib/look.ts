import type { Person } from "@fpr/contracts";
import { type MemberColor, memberColor } from "./member-color";

/** How a person shows on every screen: their name, colour, and photo. */
export type Look = {
  /** Their display name, or an anonymous viewer's pseudonym. */
  name: string;
  color: MemberColor;
  /** Their photo's URL, or `null` for their initial. */
  photo: string | null;
};

/** The look of a person as the API sends them. */
export function lookOf(person: Person): Look {
  return {
    name: person.displayName,
    color: memberColor(person.color),
    photo: person.avatarUrl,
  };
}
