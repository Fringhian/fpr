import type { Id } from "@fpr/contracts";
import type { MockStore } from "./types.ts";

/** Signs a person in, or everyone out with `null`. */
export function setSession(store: MockStore, session: Id | null): void {
  store.session = session;
  store.onSessionChange(session);
}

/** Ends a person's session, as revoking, ending or deleting does. */
export function endSessionsOf(store: MockStore, userId: Id): void {
  if (store.session === userId) {
    setSession(store, null);
  }
}
