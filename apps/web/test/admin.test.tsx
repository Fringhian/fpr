// @vitest-environment happy-dom
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import fr from "../src/locales/fr.json";
import { fixturePersonId } from "../src/mocks/fixtures/people.ts";
import { buttonNamed, click, fill, screenText } from "./interact.ts";
import { visit } from "./visit-app.tsx";

// The admin persona reads FPR in French, the language of their account.
const texts = fr.adminPeople;
const named = (text: string, name: string) => text.replace("{{name}}", name);

/** Opens the ⋯ menu of the person named `name`. */
async function openMenu(name: string) {
  await click(
    () =>
      document.body.querySelector<HTMLElement>(
        `button[aria-label="${fr.menu.moreFor.replace("{{subject}}", name)}"]`,
      ),
    () => expect(document.body.querySelector('[role="menu"]')).not.toBeNull(),
  );
}

/** A button that can load: its label, then its hidden loading label. */
function loadingButton(label: string) {
  return [...document.body.querySelectorAll<HTMLButtonElement>("button")].find(
    (button) => button.firstElementChild?.textContent === label,
  );
}

function dialog() {
  return document.body.querySelector<HTMLElement>(
    '[role="dialog"], [role="alertdialog"]',
  );
}

describe("Admin, people", () => {
  it("add a person, and show their access link once", async () => {
    const { store } = await visit("/admin/people", "admin");
    await click(
      () => buttonNamed(texts.add.member),
      () => expect(dialog()).not.toBeNull(),
    );
    const form = dialog();
    if (form === null) throw new Error("No dialog");
    fill(form, "displayName", "Rui Costa");
    fill(form, "email", "rui@example.com");

    await click(
      () => loadingButton(texts.addDialog.create),
      () =>
        expect(
          document.body.querySelector<HTMLInputElement>(
            "[role=dialog] input[readonly]",
          )?.value,
        ).toMatch(/\/access\/[\w-]{43}$/),
    );
    const link =
      document.body.querySelector<HTMLInputElement>(
        "[role=dialog] input[readonly]",
      )?.value ?? "";
    const rui = store.people.find(
      (person) => person.displayName === "Rui Costa",
    );
    expect(rui?.role).toBe("member");
    const prepare = [...document.body.querySelectorAll("a")].find(
      (anchor) => anchor.textContent === named(texts.link.prepare, "Rui Costa"),
    );
    expect(prepare?.getAttribute("href")).toMatch(
      new RegExp(`^/members/${rui?.id}\\?.*edit=1`),
    );

    await click(
      () => buttonNamed(texts.secret.done),
      () => expect(screenText()).not.toContain(link),
    );
    expect(screenText()).toContain("Rui Costa");
  });

  it("keep the dialog open while a new link is created, then show it", async () => {
    const { release } = await visit("/admin/people", "admin", {
      hold: (url) => url.pathname.endsWith("/replace-link"),
    });
    await openMenu("Charlie Moreau");
    await click(
      () => buttonNamed(texts.menu.replaceLink),
      () => expect(dialog()).not.toBeNull(),
    );
    await click(
      () => loadingButton(texts.replace.action),
      () =>
        expect(
          loadingButton(texts.replace.action)?.getAttribute("aria-busy"),
        ).toBe("true"),
    );

    await act(async () => {
      dialog()?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
      buttonNamed(fr.dialog.cancel)?.click();
      document.body
        .querySelector<HTMLElement>(`button[aria-label="${fr.dialog.close}"]`)
        ?.click();
    });
    expect(dialog()?.textContent).toContain(texts.replace.action);

    await release();
    await vi.waitFor(() =>
      expect(
        document.body.querySelector<HTMLInputElement>(
          "[role=dialog] input[readonly]",
        )?.value,
      ).toMatch(/\/access\/[\w-]{43}$/),
    );
  });

  it("keep the last admin an admin, with their access", async () => {
    await visit("/admin/people", "admin");
    await openMenu("Alex Rivière");
    for (const item of [
      texts.menu.replaceLink,
      texts.menu.revoke,
      texts.menu.delete,
    ]) {
      expect(buttonNamed(item)?.getAttribute("aria-disabled")).toBe("true");
    }
    expect(screenText()).toContain(named(texts.menu.lastAdmin, "Alex Rivière"));

    await click(
      () => buttonNamed(texts.menu.edit),
      () => expect(dialog()?.textContent).toContain(texts.fields.role),
    );
    const member = buttonNamed(texts.roles.member) as
      | HTMLButtonElement
      | undefined;
    expect(member?.disabled).toBe(true);
    expect(screenText()).toContain(named(texts.edit.lastAdmin, "Alex Rivière"));
  });

  it("delete a person once their name is typed", async () => {
    const { store } = await visit("/admin/people", "admin");
    const charlie = fixturePersonId("charlie");
    await openMenu("Charlie Moreau");
    await click(
      () => buttonNamed(texts.menu.delete),
      () => expect(dialog()).not.toBeNull(),
    );
    const confirm = () =>
      loadingButton(named(texts.delete.action, "Charlie Moreau"));
    const box = dialog();
    if (box === null) throw new Error("No dialog");

    fill(box, "typedName", "Charlie");
    expect(confirm()?.disabled).toBe(true);
    fill(box, "typedName", "Charlie Moreau");
    await click(confirm, () =>
      expect(store.people.some((person) => person.id === charlie)).toBe(false),
    );
    expect(store.entries.some((entry) => entry.userId === charlie)).toBe(false);
  });
});
