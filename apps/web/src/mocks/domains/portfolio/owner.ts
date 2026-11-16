import type { Id } from "@fpr/contracts";
import { mockError } from "../../server/errors.ts";
import { hasPortfolio, isAdmin, personOf } from "../../store/people.ts";
import type { MockPerson, MockStore, StoredEntry } from "../../store/types.ts";

/** The person whose portfolio a route reads, or `not_found` without one. */
export function portfolioOwner(store: MockStore, userId: Id): MockPerson {
  const person = personOf(store, userId);
  if (person === undefined || !hasPortfolio(person)) {
    throw mockError("not_found");
  }
  return person;
}

/** A member writes their own portfolio, the admin anyone's. */
export function writablePortfolio(
  store: MockStore,
  viewer: MockPerson,
  userId: Id,
): MockPerson {
  const owner = portfolioOwner(store, userId);
  if (owner.id !== viewer.id && !isAdmin(viewer)) {
    throw mockError("forbidden");
  }
  return owner;
}

/** A stored entry of this type the viewer may write. */
export function writableEntry<Type extends StoredEntry["type"]>(
  store: MockStore,
  viewer: MockPerson,
  id: Id,
  type: Type,
): Extract<StoredEntry, { type: Type }> {
  const entry = store.entries.find(
    (candidate): candidate is Extract<StoredEntry, { type: Type }> =>
      candidate.id === id && candidate.type === type,
  );
  if (entry === undefined) {
    throw mockError("not_found");
  }
  writablePortfolio(store, viewer, entry.userId);
  return entry;
}

/** A moment after now is refused. */
export function notInFuture(
  store: MockStore,
  effectiveAt: string | undefined,
): void {
  if (
    effectiveAt !== undefined &&
    Date.parse(effectiveAt) > store.calendar.nowMs
  ) {
    throw mockError("future_moment");
  }
}

/**
 * A client id already stored: the person's own entry is answered as it is,
 * another person's is `forbidden`.
 */
export function storedWithId(
  store: MockStore,
  userId: Id,
  id: Id | undefined,
): StoredEntry | undefined {
  const stored =
    id === undefined
      ? undefined
      : store.entries.find((entry) => entry.id === id);
  if (stored !== undefined && stored.userId !== userId) {
    throw mockError("forbidden");
  }
  return stored;
}
