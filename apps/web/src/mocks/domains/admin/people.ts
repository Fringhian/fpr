import type { AdminPerson } from "@fpr/contracts";
import { mockError } from "../../server/errors.ts";
import { mock } from "../../server/implementer.ts";
import { accessLink, newAccessKey } from "../../store/access-keys.ts";
import { timestamp } from "../../store/calendar.ts";
import {
  accessStatus,
  hasAccess,
  isAdmin,
  newPerson,
  personOf,
  toPerson,
} from "../../store/people.ts";
import { endSessionsOf } from "../../store/session.ts";
import type { MockPerson, MockStore } from "../../store/types.ts";

export function toAdminPerson(
  store: MockStore,
  person: MockPerson,
): AdminPerson {
  return {
    ...toPerson(person),
    role: person.role,
    email: person.email,
    accessStatus: accessStatus(person, store.calendar.nowMs),
    claimBefore: timestamp(person.claimBeforeMs),
    accessUntil:
      person.accessUntilMs === null ? null : timestamp(person.accessUntilMs),
    hasPortfolioEntries: store.entries.some(
      (entry) => entry.userId === person.id,
    ),
  };
}

export function requirePerson(store: MockStore, id: string): MockPerson {
  const person = personOf(store, id);
  if (person === undefined) {
    throw mockError("not_found");
  }
  return person;
}

/** The last admin with access can't lose it, change role, or be deleted. */
export function refuseLastAdmin(store: MockStore, person: MockPerson): void {
  const otherAdmins = store.people.filter(
    (other) => other !== person && isAdmin(other) && hasAccess(store, other),
  );
  if (isAdmin(person) && otherAdmins.length === 0) {
    throw mockError("last_admin");
  }
}

function refuseTakenEmail(
  store: MockStore,
  email: string,
  except?: MockPerson,
): void {
  if (
    store.people.some(
      (person) =>
        person !== except &&
        person.email?.toLowerCase() === email.toLowerCase(),
    )
  ) {
    throw mockError("email_taken");
  }
}

function untilMs(
  accessUntil: string | null | undefined,
): number | null | undefined {
  return accessUntil === null || accessUntil === undefined
    ? accessUntil
    : Date.parse(accessUntil);
}

/** The admin's people: listing, adding, editing, and deleting them. */
export const peopleRoutes = {
  people: mock.admin.people.handler(({ context }) => {
    const { store } = context;
    return store.people
      .toSorted((a, b) => a.addedAtMs - b.addedAtMs)
      .map((person) => toAdminPerson(store, person));
  }),

  addPerson: mock.admin.addPerson.handler(({ context, input }) => {
    const { store } = context;
    const email = input.role === "anonymous" ? null : input.email;
    if (email !== null) {
      refuseTakenEmail(store, email);
    }
    const accessUntilMs = untilMs(input.accessUntil) ?? null;
    if (accessUntilMs !== null && accessUntilMs <= store.calendar.nowMs) {
      throw mockError("invalid_request", {
        issues: [{ path: ["accessUntil"], code: "custom" }],
      });
    }
    const person = newPerson(store, {
      displayName: input.displayName,
      email,
      role: input.role,
      accessUntilMs,
    });
    const key = newAccessKey(store, person.id);
    return {
      person: toAdminPerson(store, person),
      accessLink: accessLink(context.origin, key),
    };
  }),

  updatePerson: mock.admin.updatePerson.handler(({ context, input }) => {
    const { store } = context;
    const person = requirePerson(store, input.id);
    if (
      input.role !== undefined &&
      input.role !== person.role &&
      (input.role === "anonymous" || person.role === "anonymous")
    ) {
      throw mockError("anonymous_role_fixed");
    }
    if (input.email !== undefined) {
      if (person.role === "anonymous") {
        throw mockError("invalid_request", {
          issues: [{ path: ["email"], code: "custom" }],
        });
      }
      refuseTakenEmail(store, input.email, person);
    }
    if (
      input.role === "guest" &&
      store.entries.some((entry) => entry.userId === person.id)
    ) {
      throw mockError("has_portfolio_entries");
    }
    const accessUntilMs = untilMs(input.accessUntil);
    const ends =
      accessUntilMs !== undefined &&
      accessUntilMs !== null &&
      accessUntilMs <= store.calendar.nowMs;
    if ((input.role !== undefined && input.role !== "admin") || ends) {
      refuseLastAdmin(store, person);
    }
    person.displayName = input.displayName ?? person.displayName;
    person.email = input.email ?? person.email;
    person.role = input.role ?? person.role;
    person.accessUntilMs =
      accessUntilMs === undefined ? person.accessUntilMs : accessUntilMs;
    if (ends) {
      endSessionsOf(store, person.id);
    }
    return toAdminPerson(store, person);
  }),

  deletePerson: mock.admin.deletePerson.handler(({ context, input }) => {
    const { store } = context;
    const person = requirePerson(store, input.id);
    refuseLastAdmin(store, person);
    endSessionsOf(store, person.id);
    store.people = store.people.filter((candidate) => candidate !== person);
    store.entries = store.entries.filter((entry) => entry.userId !== person.id);
    for (const share of store.shares) {
      share.prices = share.prices.map((price) =>
        price.enteredBy === person.id ? { ...price, enteredBy: null } : price,
      );
      share.valueEvents = share.valueEvents.map((event) =>
        event.madeBy === person.id ? { ...event, madeBy: null } : event,
      );
    }
  }),
};
