import type { Id } from "@fpr/contracts";
import { type Persona, personaSession, personas } from "../personas.ts";

const sessionKey = "fpr.mock.session";
const hiddenKey = "fpr.mock.switchHidden";

/** The persona `?mock-as=<persona>` asks for, removed from the address once read. */
function askedPersona(): Persona | undefined {
  const url = new URL(window.location.href);
  const asked = url.searchParams.get("mock-as");
  if (asked === null) {
    return undefined;
  }
  url.searchParams.delete("mock-as");
  window.history.replaceState(window.history.state, "", url);
  return asked in personas ? (asked as Persona) : undefined;
}

/**
 * Whether `?mock-empty` asks for an instance with nobody yet, where `/setup`
 * is open, removed from the address once read. It lasts until the next load.
 */
export function readEmpty(): boolean {
  const url = new URL(window.location.href);
  if (!url.searchParams.has("mock-empty")) {
    return false;
  }
  url.searchParams.delete("mock-empty");
  window.history.replaceState(window.history.state, "", url);
  return true;
}

/**
 * The session the mock API starts with: `?mock-as=<persona>`, else the one
 * saved by the last visit, else the member's.
 */
export function readSession(): Id | null {
  const asked = askedPersona();
  if (asked !== undefined) {
    writeSession(personaSession(asked));
    return personaSession(asked);
  }
  try {
    const saved = window.localStorage.getItem(sessionKey);
    return saved === null
      ? personaSession("member")
      : (JSON.parse(saved) as { session: Id | null }).session;
  } catch {
    return personaSession("member");
  }
}

/** Keeps the session across reloads, whether the switch or a sign-in changed it. */
export function writeSession(session: Id | null): void {
  try {
    window.localStorage.setItem(sessionKey, JSON.stringify({ session }));
  } catch {
    // Without storage, the session lasts until the page reloads.
  }
}

export function readHidden(): boolean {
  try {
    return window.localStorage.getItem(hiddenKey) === "true";
  } catch {
    return false;
  }
}

export function writeHidden(hidden: boolean): void {
  try {
    window.localStorage.setItem(hiddenKey, String(hidden));
  } catch {
    // Without storage, the switch shows again on reload.
  }
}
