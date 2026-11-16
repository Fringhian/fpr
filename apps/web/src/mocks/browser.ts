import { setupWorker } from "msw/browser";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { createMockHandlers, type MockFaults } from "./handlers.ts";
import { slowDelayMs, urlSwitches } from "./magic.ts";
import { RoleSwitch } from "./role-switch/role-switch.tsx";
import {
  readEmpty,
  readSession,
  writeSession,
} from "./role-switch/saved-session.ts";
import { takeUrlSwitch } from "./url-switch.ts";

function readFaults(): MockFaults {
  const slow = takeUrlSwitch(urlSwitches.slow);
  const fail = takeUrlSwitch(urlSwitches.fail);
  return {
    delayMs: slow === null ? 0 : Number(slow) || slowDelayMs,
    failPath: fail || undefined,
  };
}

/**
 * Starts the mock API for `pnpm dev:mock`: MSW's service worker answers every
 * `/api` call from an in-memory store, signed in as the saved session, and
 * the role switch shows in a corner of the page. The store starts afresh on
 * each load; the session is kept. The address switches of `urlSwitches`
 * start an instance with nobody yet, or a slow or failing API.
 */
export async function startMockApi(): Promise<void> {
  const empty = readEmpty();
  const session = empty ? null : readSession();
  const { handlers } = createMockHandlers({
    origin: window.location.origin,
    session,
    empty,
    faults: readFaults(),
    onSessionChange: writeSession,
  });
  await setupWorker(...handlers).start({
    onUnhandledFrame: "bypass",
    quiet: true,
  });
  const host = document.createElement("div");
  document.body.append(host);
  createRoot(host).render(createElement(RoleSwitch, { session }));
}
