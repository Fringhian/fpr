import { setupWorker } from "msw/browser";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { createMockHandlers } from "./handlers.ts";
import { RoleSwitch } from "./role-switch/role-switch.tsx";
import {
  readEmpty,
  readSession,
  writeSession,
} from "./role-switch/saved-session.ts";

/**
 * Starts the mock API for `pnpm dev:mock`: MSW's service worker answers every
 * `/api` call from an in-memory store, signed in as the saved session, and
 * the role switch shows in a corner of the page. The store starts afresh on
 * each load; the session is kept. `?mock-empty` starts an instance with
 * nobody yet, signed out, for `/setup`.
 */
export async function startMockApi(): Promise<void> {
  const empty = readEmpty();
  const session = empty ? null : readSession();
  const { handlers } = createMockHandlers({
    origin: window.location.origin,
    session,
    empty,
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
