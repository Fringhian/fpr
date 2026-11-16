import type { AdminAccessStatus, Id, Person } from "@fpr/contracts";
import { adminRoles, writerRoles } from "@fpr/contracts/values";
import type { MockPerson, MockStore } from "./types.ts";

export function personOf(store: MockStore, id: Id): MockPerson | undefined {
  return store.people.find((person) => person.id === id);
}

/** Where a person's access stands, checked in the API's order. */
export function accessStatus(
  person: MockPerson,
  nowMs: number,
): AdminAccessStatus {
  if (person.revoked) {
    return "revoked";
  }
  if (person.accessUntilMs !== null && person.accessUntilMs <= nowMs) {
    return "ended";
  }
  if (!person.keyClaimed) {
    return person.claimBeforeMs <= nowMs ? "expired" : "waiting";
  }
  return "active";
}

export function hasAccess(store: MockStore, person: MockPerson): boolean {
  return accessStatus(person, store.calendar.nowMs) === "active";
}

/** Admins and members have a portfolio and are ranked. */
export function hasPortfolio(person: MockPerson): boolean {
  return (writerRoles as readonly string[]).includes(person.role);
}

export function isAdmin(person: MockPerson): boolean {
  return (adminRoles as readonly string[]).includes(person.role);
}

/** Every person, in the order they were added. */
export function peopleInOrder(store: MockStore): MockPerson[] {
  return store.people.toSorted((a, b) => a.addedAtMs - b.addedAtMs);
}

/**
 * The people in the race, in the order they were added: every admin and
 * member, whatever their access. One still waiting for their link is listed,
 * so the admin can prepare their portfolio; one cut off stays with their
 * data.
 */
export function racers(store: MockStore): MockPerson[] {
  return peopleInOrder(store).filter(hasPortfolio);
}

/** A person as every screen shows them. An anonymous viewer has no picture. */
export function toPerson(person: MockPerson): Person {
  return {
    id: person.id,
    displayName: person.displayName,
    avatarUrl:
      person.avatar === null || person.role === "anonymous"
        ? null
        : `/api/users/${person.id}/avatar?v=${person.avatarVersion}`,
    color: person.color,
  };
}

/**
 * A person the admin adds, or setup creates: a key to claim within 7 days,
 * the first colour nobody has, and no password yet.
 */
export function newPerson(
  store: MockStore,
  fields: Pick<MockPerson, "displayName" | "email" | "role" | "accessUntilMs"> &
    Partial<Pick<MockPerson, "password" | "keyClaimed">>,
): MockPerson {
  const now = store.calendar.nowMs;
  const person: MockPerson = {
    id: crypto.randomUUID(),
    color: freeColor(store),
    language: null,
    onboarded: false,
    avatar: null,
    avatarVersion: 0,
    password: null,
    keyClaimed: false,
    revoked: false,
    claimBeforeMs: now + 7 * 24 * 60 * 60 * 1000,
    addedAtMs: now,
    ...fields,
  };
  store.people.push(person);
  return person;
}

/** The first colour nobody has, or the first one once all ten are taken. */
export function freeColor(store: MockStore): number {
  const taken = new Set(store.people.map((person) => person.color));
  return (
    Array.from({ length: 10 }, (_, index) => index + 1).find(
      (color) => !taken.has(color),
    ) ?? 1
  );
}
