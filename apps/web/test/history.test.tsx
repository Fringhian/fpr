// @vitest-environment happy-dom
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { formatDate } from "../src/lib/format/date.ts";
import { inThisYear } from "../src/lib/race-day.ts";
import { fixturePersonId } from "../src/mocks/fixtures/people.ts";
import {
  dayOf,
  localInstant,
  MOCK_RACE_TIME_ZONE,
} from "../src/mocks/store/calendar.ts";
import { buttonNamed, click, screenText } from "./interact.ts";
import { visit } from "./visit-app.tsx";

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

  it("dates each entry in the race's time zone the session names", async () => {
    const zone = "America/New_York";
    const { queryClient, store } = await visit("/portfolio/history", "member", {
      raceTimeZone: zone,
    });
    // 02:00 in Paris, where the mock dates its days, is the evening before
    // in New York.
    const change = store.entries.find(
      (entry) => entry.type === "change" && entry.quantityDelta === "2.5",
    );
    if (change === undefined) throw new Error("No change to move");
    change.atMs = localInstant(dayOf(change.atMs), "02:00:00");
    change.effectiveAt = new Date(change.atMs).toISOString();
    await act(() => queryClient.invalidateQueries());

    const day = () =>
      [...document.body.querySelectorAll<HTMLElement>("ol > li")]
        .find((li) => li.textContent?.includes("Bought 2.5 Global Tech Fund"))
        ?.querySelector("time")?.textContent;
    const year = !inThisYear(change.atMs);
    await vi.waitFor(() =>
      expect(day()).toBe(
        formatDate(change.effectiveAt, "en", { timeZone: zone, year }),
      ),
    );
    expect(day()).not.toBe(
      formatDate(change.effectiveAt, "en", {
        timeZone: MOCK_RACE_TIME_ZONE,
        year,
      }),
    );
  });

  it("names the admin on the entries they made for a member, and no one on the member's own", async () => {
    // The admin persona reads FPR in French.
    await visit(`/members/${fixturePersonId("jordan")}/history`, "admin");
    const rows = () =>
      [...document.body.querySelectorAll<HTMLElement>("ol > li")].map(
        (li) => li.textContent ?? "",
      );
    await vi.waitFor(() =>
      expect(rows().some((row) => row.includes("Achat de 300 Clean"))).toBe(
        true,
      ),
    );

    const byAdmin = rows().filter((row) => row.includes("par Alex Rivière"));
    expect(byAdmin).toHaveLength(1);
    expect(byAdmin[0]).toContain("Achat de 300 Clean Energy Fund");
  });
});
