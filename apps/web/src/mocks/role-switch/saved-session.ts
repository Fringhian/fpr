import type { Id } from "@fpr/contracts";
import { urlSwitches } from "../magic.ts";
import { type Persona, personaSession, personas } from "../personas.ts";
import { takeUrlSwitch } from "../url-switch.ts";

const sessionKey = "fpr.mock.session";
const hiddenKey = "fpr.mock.switchHidden";

/** The persona `?mock-as=<persona>` asks for. */
function askedPersona(): Persona | undefined {
  const asked = takeUrlSwitch(urlSwitches.persona);
  return asked !== null && asked in personas ? (asked as Persona) : undefined;
}

/** Whether `?mock-empty` asks for an instance with nobody yet, where `/setup` is open. */
export function readEmpty(): boolean {
  return takeUrlSwitch(urlSwitches.empty) !== null;
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
