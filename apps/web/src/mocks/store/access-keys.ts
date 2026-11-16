import type { AccessKeyState, Id } from "@fpr/contracts";
import { accessStatus, personOf } from "./people.ts";
import type { MockPerson, MockStore } from "./types.ts";

const keyStates = {
  active: "claimed",
  waiting: "waiting",
  expired: "expired",
  revoked: "revoked",
  ended: "ended",
} as const;

/** What an access key is now, and whose it is. */
export function keyState(
  store: MockStore,
  key: string,
): { state: AccessKeyState; person: MockPerson | null } {
  const entry = store.accessKeys.get(key);
  const person =
    entry === undefined ? undefined : personOf(store, entry.userId);
  if (entry === undefined || person === undefined) {
    return { state: "unknown", person: null };
  }
  if (entry.replaced) {
    return { state: "replaced", person };
  }
  return {
    state: keyStates[accessStatus(person, store.calendar.nowMs)],
    person,
  };
}

/**
 * A new key for a person, waiting for first use: 32 random bytes in
 * base64url. Their earlier keys read as `replaced`.
 */
export function newAccessKey(store: MockStore, userId: Id): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const key = btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/, "");
  for (const entry of store.accessKeys.values()) {
    if (entry.userId === userId) {
      entry.replaced = true;
    }
  }
  store.accessKeys.set(key, { userId, replaced: false });
  return key;
}

/** The link that carries a key: `<origin>/access/<key>`. */
export function accessLink(origin: string, key: string): string {
  return `${origin}/access/${key}`;
}
