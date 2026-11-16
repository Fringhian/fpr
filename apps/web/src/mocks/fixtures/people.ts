import type { Language, Role } from "@fpr/contracts";
import { fixtureId } from "./random.ts";

/**
 * Where a fixture person's access stands: `waiting` and `expired` keys were
 * never used, `ended` passed its end date.
 */
type FixtureAccess = "claimed" | "waiting" | "expired" | "revoked" | "ended";

export type FixturePerson = {
  key: string;
  id: string;
  displayName: string;
  email: string | null;
  role: Role;
  color: number;
  language: Language | null;
  onboarded: boolean;
  addedDaysAgo: number;
  access: FixtureAccess;
  hasPassword: boolean;
  /** Days from today to the end of their access, or `null` for no end. */
  accessUntilDays: number | null;
  /** Whether they uploaded a picture. */
  picture: boolean;
};

type Fields = Omit<FixturePerson, "id" | "email" | "accessUntilDays"> & {
  accessUntilDays?: number;
};

function person<const Key extends string>(
  n: number,
  fields: Fields & { key: Key },
): FixturePerson & { key: Key } {
  const email =
    fields.role === "anonymous" ? null : `${fields.key}@example.com`;
  return {
    id: fixtureId(n),
    email,
    accessUntilDays: null,
    ...fields,
  };
}

const member = {
  role: "member",
  onboarded: true,
  access: "claimed",
  hasPassword: true,
  picture: false,
} as const;

/**
 * Every person of the mock instance, all invented: an admin and six members
 * in the race, one of them still onboarding, a guest, an anonymous viewer,
 * and one person in each other access state.
 */
export const fixturePeople = [
  person(101, {
    ...member,
    key: "alex",
    displayName: "Alex Rivière",
    role: "admin",
    color: 1,
    language: "fr",
    addedDaysAgo: 430,
    picture: true,
  }),
  person(102, {
    ...member,
    key: "sam",
    displayName: "Sam Dubois",
    color: 2,
    language: "en",
    addedDaysAgo: 420,
    picture: true,
  }),
  person(103, {
    ...member,
    key: "robin",
    displayName: "Robin Leclerc",
    color: 3,
    language: null,
    addedDaysAgo: 400,
  }),
  person(104, {
    ...member,
    key: "jordan",
    displayName: "Jordan Petit",
    color: 4,
    language: "fr",
    addedDaysAgo: 380,
  }),
  person(105, {
    ...member,
    key: "charlie",
    displayName: "Charlie Moreau",
    color: 5,
    language: "en",
    addedDaysAgo: 75,
  }),
  person(106, {
    ...member,
    key: "lou",
    displayName: "Lou Garnier",
    color: 6,
    language: null,
    addedDaysAgo: 12,
  }),
  person(107, {
    ...member,
    key: "noa",
    displayName: "Noa Lambert",
    color: 7,
    language: "fr",
    onboarded: false,
    addedDaysAgo: 3,
  }),
  person(108, {
    ...member,
    key: "morgan",
    displayName: "Morgan Blanc",
    role: "guest",
    color: 8,
    language: "fr",
    addedDaysAgo: 200,
    accessUntilDays: 90,
  }),
  person(109, {
    ...member,
    key: "camille",
    displayName: "Camille Roux",
    color: 9,
    language: null,
    onboarded: false,
    addedDaysAgo: 2,
    access: "waiting",
    hasPassword: false,
  }),
  person(110, {
    ...member,
    key: "ines",
    displayName: "Inès Caron",
    color: 10,
    language: "en",
    addedDaysAgo: 300,
    access: "waiting",
  }),
  person(111, {
    ...member,
    key: "eden",
    displayName: "Eden Martin",
    color: 1,
    language: "en",
    addedDaysAgo: 350,
    access: "revoked",
  }),
  person(112, {
    ...member,
    key: "dominique",
    displayName: "Dominique Faure",
    role: "guest",
    color: 2,
    language: null,
    onboarded: false,
    addedDaysAgo: 30,
    access: "expired",
    hasPassword: false,
  }),
  person(113, {
    ...member,
    key: "sacha",
    displayName: "Sacha Bernard",
    color: 3,
    language: "fr",
    addedDaysAgo: 250,
    access: "ended",
    accessUntilDays: -5,
  }),
  person(114, {
    ...member,
    key: "viewer",
    displayName: "Reviewer",
    role: "anonymous",
    color: 4,
    language: null,
    addedDaysAgo: 100,
    hasPassword: false,
  }),
] as const satisfies readonly FixturePerson[];

export type PersonKey = (typeof fixturePeople)[number]["key"];

export function fixturePersonId(key: PersonKey): string {
  const found = fixturePeople.find((candidate) => candidate.key === key);
  if (found === undefined) {
    throw new Error(`No fixture person ${key}`);
  }
  return found.id;
}
