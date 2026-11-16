import type { User } from "@fpr/db";

/** Every password user signs in with this password. */
export const SEED_PASSWORD = "development password";

export type PersonKey =
  | "alex"
  | "sam"
  | "robin"
  | "charlie"
  | "jordan"
  | "camille"
  | "morgan"
  | "viewer";

/**
 * A person's columns, with seed-only fields: a key the other entries refer
 * to, since ids don't exist yet, and the day they joined.
 */
export interface SeedPerson
  extends Pick<User, "displayName" | "role" | "color" | "locale"> {
  key: PersonKey;
  /** Empty for the anonymous viewer, who gets `<id>@anonymous.invalid`. */
  email: string | null;
  /**
   * The day the admin added them. `null`: added when the seed runs, with a
   * link waiting for first use.
   */
  joinedDay: number | null;
}

/** One person of every role. Every name and email is made up. */
export const people: readonly SeedPerson[] = [
  {
    key: "alex",
    displayName: "Alex Rivière",
    email: "alex@example.com",
    role: "admin",
    color: 1,
    locale: "fr",
    joinedDay: 0,
  },
  {
    key: "sam",
    displayName: "Sam Dubois",
    email: "sam@example.com",
    role: "member",
    color: 2,
    locale: "en",
    joinedDay: 8,
  },
  {
    key: "robin",
    displayName: "Robin Leclerc",
    email: "robin@example.com",
    role: "member",
    color: 3,
    locale: null,
    joinedDay: 18,
  },
  {
    key: "jordan",
    displayName: "Jordan Petit",
    email: "jordan@example.com",
    role: "member",
    color: 4,
    locale: "fr",
    joinedDay: 28,
  },
  {
    key: "charlie",
    displayName: "Charlie Moreau",
    email: "charlie@example.com",
    role: "member",
    color: 5,
    locale: "en",
    joinedDay: 125,
  },
  {
    key: "camille",
    displayName: "Camille Roux",
    email: "camille@example.com",
    role: "member",
    color: 6,
    locale: null,
    joinedDay: null,
  },
  {
    key: "morgan",
    displayName: "Morgan Blanc",
    email: "morgan@example.com",
    role: "guest",
    color: 7,
    locale: "fr",
    joinedDay: 60,
  },
  {
    key: "viewer",
    displayName: "Reviewer",
    email: null,
    role: "anonymous",
    color: 8,
    locale: null,
    joinedDay: 90,
  },
];
