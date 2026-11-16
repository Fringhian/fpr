// @vitest-environment happy-dom
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { fixturePersonId } from "../src/mocks/fixtures/people.ts";
import { fixtureShareId } from "../src/mocks/fixtures/shares.ts";
import type { StoredChange } from "../src/mocks/store/types.ts";
import { click, submit, typeInto } from "./interact.ts";
import { visit } from "./visit-app.tsx";

const SAM = fixturePersonId("sam");

function text(): string {
  return document.body.textContent ?? "";
}

function named(role: string, name: RegExp): HTMLElement | undefined {
  return [
    ...document.body.querySelectorAll<HTMLElement>(`[role="${role}"], ${role}`),
  ].find((element) => name.test(element.textContent ?? ""));
}

function amountField(page: HTMLElement) {
  return page.querySelector<HTMLInputElement>('input[name="amount"]');
}

/** A day `days` before today, in the race's zone. */
function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().slice(0, 10);
}

/** Sam's share changes in the mock store. */
function samsChanges(entries: readonly { type: string; userId: string }[]) {
  return entries.filter(
    (entry): entry is StoredChange =>
      entry.type === "change" && entry.userId === SAM,
  );
}

describe("Record a change", () => {
  it("records a purchase step by step, then Portfolio shows it", async () => {
    const { page, router, store } = await visit("/portfolio/record", "member");
    const before = samsChanges(store.entries).length;

    await click(
      () => named("radio", /^Bought shares/),
      () =>
        expect(
          named("radio", /^Bought shares/)?.getAttribute("aria-checked"),
        ).toBe("true"),
    );
    await submit(page, () => expect(text()).toContain("Which share?"));
    await click(
      () => named("radio", /^World Index ETF/),
      () =>
        expect(
          named("radio", /^World Index ETF/)?.getAttribute("aria-checked"),
        ).toBe("true"),
    );
    await submit(page, () => expect(text()).toContain("When?"));
    await submit(page, () => expect(text()).toContain("How many did you buy?"));
    typeInto(amountField(page), "7.25");
    await submit(page, () => expect(text()).toContain("Check and save"));
    await submit(page, () =>
      expect(text()).toContain("Bought 7.25 World Index ETF on"),
    );

    const saved = samsChanges(store.entries);
    expect(saved).toHaveLength(before + 1);
    expect(saved.at(-1)).toMatchObject({
      shareId: fixtureShareId("world"),
      quantityDelta: "7.25",
    });

    await act(() => router.navigate({ to: "/portfolio" }));
    await vi.waitFor(() =>
      expect(text()).toContain("Bought 7.25 World Index ETF"),
    );
  });

  it("reads an amount in English: a comma between thousands, never as the decimal mark", async () => {
    const { page, store } = await visit(
      `/portfolio/record?kind=cash&step=amount&start=when&day=${daysAgo(1)}`,
      "member",
    );
    await vi.waitFor(() => expect(amountField(page)).toBeTruthy());

    typeInto(amountField(page), "1,20");
    await submit(page, () =>
      expect(text()).toContain("Enter an amount of zero or more"),
    );
    typeInto(amountField(page), "1,200");
    await submit(page, () => expect(text()).toContain("€1,200.00"));
    await submit(page, () => expect(text()).toContain("This session"));
    expect(store.entries.at(-1)).toMatchObject({ amountEur: "1200" });
  });

  it("reads an amount in French: spaces between thousands, a comma before the decimals", async () => {
    const { page, store } = await visit(
      `/portfolio/record?kind=cash&step=amount&start=when&day=${daysAgo(1)}`,
      fixturePersonId("jordan"),
      { language: "fr" },
    );
    await vi.waitFor(() => expect(amountField(page)).toBeTruthy());

    typeInto(amountField(page), "1 200,50");
    await submit(page, () =>
      expect(text()).toContain("Vérifier et enregistrer"),
    );
    await submit(page, () => expect(text()).toContain("Cette session"));
    expect(store.entries.at(-1)).toMatchObject({ amountEur: "1200.50" });
  });

  it("refuses a sale that breaks a later one, naming it, and saves nothing", async () => {
    const energy = fixtureShareId("energy");
    const { page, store } = await visit(
      `/portfolio/record?kind=sell&share=${energy}&step=amount&start=when&day=${daysAgo(300)}`,
      "member",
    );
    const before = store.entries.length;
    await vi.waitFor(() => expect(text()).toContain("You held 150 on"));

    typeInto(amountField(page), "120");
    await submit(page, () => expect(text()).toContain("Check and save"));
    await submit(page, () =>
      expect(text()).toContain("“Sold 50 Clean Energy Fund” on"),
    );
    expect(text()).toContain("How many did you sell?");
    expect(store.entries).toHaveLength(before);
  });

  it("saves once when Save change is pressed twice", async () => {
    const world = fixtureShareId("world");
    const { page, store } = await visit(
      `/portfolio/record?kind=buy&share=${world}&step=review&start=when&day=${daysAgo(1)}&amount=3`,
      "member",
    );
    const before = store.entries.length;
    await vi.waitFor(() => expect(text()).toContain("3 World Index ETF"));

    const save = page.querySelector<HTMLButtonElement>(
      'form button[type="submit"]',
    );
    await act(async () => {
      save?.click();
      save?.click();
      await vi.waitFor(() => expect(text()).toContain("This session"));
    });
    expect(store.entries).toHaveLength(before + 1);
  });

  it("lets the admin record for a member from their page in edit mode, then returns there", async () => {
    const { page, router, store } = await visit(
      `/members/${SAM}?edit=true`,
      "admin",
    );
    const before = samsChanges(store.entries).length;
    const link = (href: string) =>
      page.querySelector<HTMLAnchorElement>(`a[href^="${href}"]`);

    await click(
      () => link(`/members/${SAM}/record`),
      () =>
        expect(router.state.location.pathname).toBe(`/members/${SAM}/record`),
    );
    const world = fixtureShareId("world");
    await act(() =>
      router.navigate({
        to: "/members/$userId/record",
        params: { userId: SAM },
        search: {
          kind: "buy",
          share: world,
          step: "review",
          start: "when",
          day: daysAgo(1),
          amount: "4",
        },
      }),
    );
    await vi.waitFor(() => expect(text()).toContain("4 World Index ETF"));
    await submit(page, () =>
      expect(samsChanges(store.entries)).toHaveLength(before + 1),
    );
    expect(samsChanges(store.entries).at(-1)).toMatchObject({
      shareId: world,
      quantityDelta: "4",
    });

    await click(
      () => link(`/members/${SAM}?edit=true`),
      () => expect(router.state.location.pathname).toBe(`/members/${SAM}`),
    );
    expect(router.state.location.search).toMatchObject({ edit: true });
    await vi.waitFor(() =>
      expect(link(`/members/${SAM}/history`)).toBeTruthy(),
    );
  });

  it("edits an entry in place, from its day to its quantity", async () => {
    const { store } = await visit("/", "member");
    const entry = samsChanges(store.entries).find(
      (change) => change.quantityDelta === "2.5",
    );
    const { page, store: edited } = await visit(
      `/portfolio/record?entry=${entry?.id}`,
      "member",
    );
    const before = edited.entries.length;

    await vi.waitFor(() => expect(text()).toContain("When?"));
    await submit(page, () => expect(amountField(page)?.value).toBe("2.5"));
    typeInto(amountField(page), "3");
    await submit(page, () => expect(text()).toContain("Check and save"));
    await submit(page, () =>
      expect(text()).toContain("Bought 3 Global Tech Fund on"),
    );

    expect(edited.entries).toHaveLength(before);
    expect(edited.entries.find(({ id }) => id === entry?.id)).toMatchObject({
      quantityDelta: "3",
    });
  });
});
