// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { click } from "./interact.ts";
import { visit } from "./visit-app.tsx";

/** The text of the whole document: menus and toasts render in portals. */
function screenText(): string {
  return document.body.textContent ?? "";
}

function buttonNamed(name: string): HTMLElement | undefined {
  return [
    ...document.body.querySelectorAll<HTMLElement>("button, [role=menuitem]"),
  ].find((element) => element.textContent?.trim() === name);
}

/** Deletes the History row that says `title` through its ⋯ menu. */
async function deleteRow(title: string, done: () => void) {
  const row = () =>
    [...document.body.querySelectorAll<HTMLElement>("ol > li")].find((li) =>
      li.textContent?.includes(title),
    );
  await click(
    () => row()?.querySelector("button") ?? undefined,
    () => expect(buttonNamed("Delete")).toBeDefined(),
  );
  await click(() => buttonNamed("Delete"), done);
}

describe("History", () => {
  it("deletes a change at once, then records it again on Undo", async () => {
    const { store } = await visit("/portfolio/history", "member");
    await vi.waitFor(() =>
      expect(screenText()).toContain("Bought 2.5 Global Tech Fund"),
    );
    const count = store.entries.length;

    await deleteRow("Bought 2.5 Global Tech Fund", () =>
      expect(screenText()).toContain("Change deleted"),
    );
    expect(store.entries).toHaveLength(count - 1);

    await click(
      () => buttonNamed("Undo"),
      () => expect(store.entries).toHaveLength(count),
    );
    expect(store.entries.at(-1)).toMatchObject({
      type: "change",
      quantityDelta: "2.5",
    });
  });

  it("refuses a delete that takes a holding below zero, naming the change it breaks", async () => {
    const { store } = await visit("/portfolio/history", "member");
    await vi.waitFor(() =>
      expect(screenText()).toContain("Bought 150 Clean Energy Fund"),
    );
    const count = store.entries.length;

    await deleteRow("Bought 150 Clean Energy Fund", () =>
      expect(screenText()).toContain("Can’t delete this entry"),
    );
    expect(screenText()).toContain("“Sold 50 Clean Energy Fund” on");
    expect(store.entries).toHaveLength(count);
  });
});
