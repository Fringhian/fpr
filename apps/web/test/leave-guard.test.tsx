// @vitest-environment happy-dom
import {
  createBrowserHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from "@tanstack/react-router";
import { act } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it, vi } from "vitest";
import { createI18n } from "../src/lib/i18n.ts";
import { LeaveGuard } from "../src/lib/leave-guard.tsx";
import { signOutOnAccessEnded } from "../src/lib/session/session-ended.ts";

/** Whether the browser would ask before the page unloads. */
function asksBeforeUnload(): boolean {
  const event = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(event);
  return event.defaultPrevented;
}

describe("the leave guard", () => {
  it("lets the page go without the browser's prompt once the session is over", async () => {
    const replace = vi
      .spyOn(window.location, "replace")
      .mockImplementation(() => undefined);
    const router = createRouter({
      routeTree: createRootRoute({ component: () => <LeaveGuard when /> }),
      history: createBrowserHistory(),
    });
    const root = createRoot(
      document.body.appendChild(document.createElement("div")),
    );
    await act(async () => {
      await router.load();
      root.render(
        <I18nextProvider i18n={createI18n("en")}>
          <RouterProvider router={router} />
        </I18nextProvider>,
      );
    });

    expect(asksBeforeUnload()).toBe(true);
    signOutOnAccessEnded();
    expect(replace).toHaveBeenCalledWith("/sign-in?access=ended");
    expect(asksBeforeUnload()).toBe(false);

    act(() => root.unmount());
  });
});
