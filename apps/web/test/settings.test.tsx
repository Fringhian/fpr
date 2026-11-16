// @vitest-environment happy-dom
import { act } from "react";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { watchInstall } from "../src/lib/install-app.ts";
import { fixturePersonId } from "../src/mocks/fixtures/people.ts";
import { mockPassword } from "../src/mocks/magic.ts";
import { buttonNamed, click, fill, screenText } from "./interact.ts";
import { visit } from "./visit-app.tsx";

const samId = fixturePersonId("sam");
const iPhone =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

/** Opens Settings from the account menu. */
async function openSettings() {
  await click(
    () =>
      document.body.querySelector<HTMLElement>(
        'button[aria-label="Sam Dubois, your account"]',
      ),
    () => expect(buttonNamed("Settings")).toBeDefined(),
  );
  await click(
    () => buttonNamed("Settings"),
    () => expect(document.body.querySelector('[role="dialog"]')).not.toBeNull(),
  );
}

function submitButton() {
  return document.body.querySelector<HTMLElement>(
    '[role="dialog"] form button[type="submit"]',
  );
}

describe("Settings", () => {
  it("change the password only with the current one", async () => {
    const { store } = await visit("/", "member");
    const sam = store.people.find((person) => person.id === samId);
    await openSettings();
    await click(
      () => buttonNamed("Change password"),
      () =>
        expect(
          document.body.querySelector('input[name="currentPassword"]'),
        ).not.toBeNull(),
    );

    fill(document.body, "currentPassword", "not my password");
    fill(document.body, "password", "a brand new password");
    await click(submitButton, () =>
      expect(screenText()).toContain("This isn’t your current password"),
    );
    expect(sam?.password).toBe(mockPassword);

    fill(document.body, "currentPassword", mockPassword);
    await click(submitButton, () =>
      expect(screenText()).toContain("Password changed"),
    );
    expect(sam?.password).toBe("a brand new password");
  });

  it("save a colour once picked, and refuse one taken meanwhile", async () => {
    const { store } = await visit("/", "member");
    const sam = store.people.find((person) => person.id === samId);
    const others = store.people.filter((person) => person.id !== samId);
    // Everyone else on the first colour, so the API refuses only a taken one.
    for (const person of others) person.color = 1;
    await openSettings();
    const swatch = (color: number) =>
      document.body.querySelectorAll<HTMLElement>(
        '[role="dialog"] [role="radio"]',
      )[color - 1];

    await click(
      () => swatch(5),
      () => expect(sam?.color).toBe(5),
    );

    const [someone] = others;
    if (someone) someone.color = 6;
    await click(
      () => swatch(6),
      () =>
        expect(screenText()).toContain("Someone has just taken this colour"),
    );
    expect(sam?.color).toBe(5);
    expect(swatch(5)?.getAttribute("aria-checked")).toBe("true");
  });

  it("offer no install in an app opened from the home screen", async () => {
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(iPhone);
    Object.defineProperty(navigator, "standalone", {
      value: true,
      configurable: true,
    });
    onTestFinished(() => {
      Reflect.deleteProperty(navigator, "standalone");
    });
    await visit("/", "member");
    await openSettings();

    expect(screenText()).toContain("How FPR works");
    expect(buttonNamed("Install the app")).toBeUndefined();
  });

  it("install the app: the Share menu's steps on an iPhone, the browser's prompt where it has one", async () => {
    watchInstall();
    vi.spyOn(navigator, "userAgent", "get").mockReturnValue(iPhone);
    await visit("/", "member");
    await openSettings();
    await click(
      () => buttonNamed("Install the app"),
      () => expect(screenText()).toContain("Add to Home Screen"),
    );

    const prompt = vi.fn(() => Promise.resolve());
    const offer = Object.assign(
      new Event("beforeinstallprompt", { cancelable: true }),
      { prompt, userChoice: Promise.resolve({ outcome: "accepted" }) },
    );
    act(() => window.dispatchEvent(offer));
    expect(offer.defaultPrevented).toBe(true);
    expect(screenText()).not.toContain("Add to Home Screen");

    await click(
      () => buttonNamed("Install the app"),
      () => expect(buttonNamed("Install the app")).toBeUndefined(),
    );
    expect(prompt).toHaveBeenCalledOnce();
  });
});
