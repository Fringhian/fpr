import { setupWorker } from "msw/browser";
import { createElement } from "react";
import { createRoot } from "react-dom/client";
import { createMockHandlers } from "./handlers.ts";
import { RoleSwitch } from "./role-switch/role-switch.tsx";
import { readSession, writeSession } from "./role-switch/saved-session.ts";

/**
 * Starts the mock API for `pnpm dev:mock`: MSW's service worker answers every
 * `/api` call from an in-memory store, signed in as the saved session, and
 * the role switch shows in a corner of the page. The store starts afresh on
 * each load; the session is kept.
 */
export async function startMockApi(): Promise<void> {
  const session = readSession();
  const { handlers } = createMockHandlers({
    origin: window.location.origin,
    session,
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
