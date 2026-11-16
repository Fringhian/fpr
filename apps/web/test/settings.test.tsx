// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { fixturePersonId } from "../src/mocks/fixtures/people.ts";
import { mockPassword } from "../src/mocks/magic.ts";
import { buttonNamed, click, fill, screenText } from "./interact.ts";
import { visit } from "./visit-app.tsx";

const samId = fixturePersonId("sam");

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
});
