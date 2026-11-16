import type { Id } from "@fpr/contracts";
import { fixturePersonId, type PersonKey } from "./fixtures/people.ts";

/** Who the mock API signs in, by role: what the role switch and stories pick from. */
export const personas = {
  admin: { label: "Admin", person: "alex" },
  member: { label: "Member", person: "sam" },
  newcomer: { label: "Member, onboarding", person: "noa" },
  guest: { label: "Guest", person: "morgan" },
  anonymous: { label: "Anonymous viewer", person: "viewer" },
  signedOut: { label: "Signed out", person: null },
} as const satisfies Record<
  string,
  { label: string; person: PersonKey | null }
>;

export type Persona = keyof typeof personas;

/** The session a persona starts with. */
export function personaSession(persona: Persona): Id | null {
  const { person } = personas[persona];
  return person === null ? null : fixturePersonId(person);
}

/** The session a persona or a person's id names. */
export function sessionOf(session: Persona | Id | null | undefined): Id | null {
  if (session === undefined || session === null) {
    return null;
  }
  return session in personas ? personaSession(session as Persona) : session;
}

/** The persona of a session, if it is one. */
export function personaOf(session: Id | null): Persona | undefined {
  return (Object.keys(personas) as Persona[]).find(
    (persona) => personaSession(persona) === session,
  );
}
