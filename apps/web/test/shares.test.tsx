// @vitest-environment happy-dom
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { fixtureShareId } from "../src/mocks/fixtures/shares.ts";
import {
  addDays,
  localInstant,
  tradingDayOnOrBefore,
} from "../src/mocks/store/calendar.ts";
import { click, submit, typeInto } from "./interact.ts";
import { visit } from "./visit-app.tsx";

function text(): string {
  return document.body.textContent ?? "";
}

function button(name: RegExp): HTMLButtonElement | undefined {
  return [...document.body.querySelectorAll("button")].find((element) =>
    name.test(element.textContent ?? ""),
  );
}

function field(name: string): HTMLInputElement | null {
  return document.body.querySelector<HTMLInputElement>(`input[name="${name}"]`);
}

describe("Shares", () => {
  it("looks a text up, then adds a listing under the ISIN typed and opens it", async () => {
    const { router, store } = await visit("/shares?q=space", "member");

    await click(
      () => button(/^Look up/),
      () => expect(text()).toContain("Found at the price provider"),
    );
    await click(
      () => button(/^Add$/),
      () => expect(field("isin")).toBeTruthy(),
    );
    typeInto(field("isin"), "ie00 fprspc10");
    await click(
      () => button(/^Add share/),
      () => expect(router.state.location.pathname).not.toBe("/shares"),
    );

    const stored = store.shares.find((share) => share.isin === "IE00FPRSPC10");
    expect(stored).toMatchObject({ name: "Space Economy Fund" });
    expect(router.state.location.pathname).toBe(`/shares/${stored?.id}`);
  });

  it("looks a full ISIN up by itself, and adding what it finds opens it", async () => {
    const { router, store } = await visit("/shares?q=IE00FPRWTR13", "member");

    await click(
      () => button(/^Add$/),
      () => expect(router.state.location.pathname).not.toBe("/shares"),
    );
    const stored = store.shares.find((share) => share.isin === "IE00FPRWTR13");
    expect(router.state.location.pathname).toBe(`/shares/${stored?.id}`);
  });

  it("says when the provider can't be asked, and still offers a manual share", async () => {
    await visit("/shares?q=budget", "member");

    await click(
      () => button(/^Look up/),
      () => expect(text()).toContain("Today’s price lookups are used up"),
    );
    expect(
      document.body.querySelector('a[href^="/shares/new"]')?.textContent,
    ).toBe("Create a manual share");
  });

  it("offers no lookup to a guest", async () => {
    await visit("/shares?q=water", "guest");

    // The guest's own language is French: the search's line quotes the text.
    await vi.waitFor(() =>
      expect(
        document.body.querySelector('[role="status"]')?.textContent,
      ).toContain("water"),
    );
    expect(button(/water/)).toBeUndefined();
    expect(document.body.querySelector('a[href^="/shares/new"]')).toBeNull();
  });

  it("refuses a manual share whose ISIN FPR has, with a link to that share", async () => {
    const { page, store } = await visit(
      "/shares/new?isin=IE00FPRWLD09",
      "member",
    );
    const before = store.shares.length;

    typeInto(field("name"), "Example Fund");
    typeInto(field("price"), "40.10");
    await submit(page, () =>
      expect(text()).toContain("Another share in FPR already has this ISIN."),
    );
    expect(
      page.querySelector(`a[href="/shares/${fixtureShareId("world")}"]`)
        ?.textContent,
    ).toBe("Open that share");
    expect(store.shares).toHaveLength(before);
  });

  it("creates a manual share and opens its page", async () => {
    const { page, router, store } = await visit(
      "/shares/new?isin=LU00FPRNEW01",
      "member",
    );

    typeInto(field("name"), "Example Fund");
    typeInto(field("price"), "40.10");
    await submit(page, () =>
      expect(router.state.location.pathname).not.toBe("/shares/new"),
    );
    const stored = store.shares.find((share) => share.isin === "LU00FPRNEW01");
    expect(stored).toMatchObject({ name: "Example Fund", kind: "manual" });
    expect(stored?.prices[0]?.priceEur).toBe("40.10");
    expect(router.state.location.pathname).toBe(`/shares/${stored?.id}`);
  });

  it("adds a value to a manual share, then opens its page", async () => {
    const wind = fixtureShareId("wind");
    const { page, router, store } = await visit(
      `/shares/${wind}/value`,
      "member",
    );

    await vi.waitFor(() => expect(field("price")).toBeTruthy());
    typeInto(field("price"), "54.20");
    await submit(page, () =>
      expect(router.state.location.pathname).toBe(`/shares/${wind}`),
    );
    const share = store.shares.find(({ id }) => id === wind);
    expect(share?.prices.at(-1)?.priceEur).toBe("54.20");
  });

  it("shows a value someone changed meanwhile, and saves the edit once confirmed", async () => {
    const wind = fixtureShareId("wind");
    const { page, router, store } = await visit("/shares", "member");
    const value = store.shares.find(({ id }) => id === wind)?.prices.at(-1);
    if (value === undefined) throw new Error("No value to edit");
    const at = new Date(value.atMs).toISOString();
    await act(() =>
      router.navigate({ href: `/shares/${wind}/value?at=${at}` }),
    );
    await vi.waitFor(() => expect(field("price")?.value).toBe("53.10"));

    value.priceEur = "60.00";
    typeInto(field("price"), "54");
    await submit(page, () =>
      expect(text()).toContain("Robin Leclerc changed this value to €60.00"),
    );
    expect(value.priceEur).toBe("60.00");

    await submit(page, () =>
      expect(router.state.location.pathname).toBe(`/shares/${wind}`),
    );
    expect(value.priceEur).toBe("54");
  });

  it("returns a new manual share to Record a change picked, without the last share's quantity", async () => {
    const world = fixtureShareId("world");
    const back = `/portfolio/record?kind=buy&step=share&share=${world}&amount=5`;
    const { page, router, store } = await visit(
      `/shares/new?isin=LU00FPRNEW01&pick=true&back=${encodeURIComponent(back)}`,
      "member",
    );

    typeInto(field("name"), "Example Fund");
    typeInto(field("price"), "40.10");
    await submit(page, () =>
      expect(router.state.location.pathname).toBe("/portfolio/record"),
    );
    const stored = store.shares.find((share) => share.isin === "LU00FPRNEW01");
    expect(router.state.location.search).toMatchObject({
      kind: "buy",
      step: "share",
      share: stored?.id,
    });
    expect(router.state.location.search).not.toHaveProperty("amount");
  });

  it("shows an anonymous viewer a share bought before its first price that day, its change unmarked", async () => {
    const robotics = fixtureShareId("robotics");
    const { queryClient, store } = await visit(
      `/shares/${robotics}?period=1M`,
      "anonymous",
    );
    // A purchase at 10:15 on a trading day, the share's first price at noon:
    // the change has no weight, and its day is the chart's first.
    const day = tradingDayOnOrBefore(addDays(store.calendar.today, -3));
    const change = store.entries.find(
      (entry) => entry.type === "change" && entry.shareId === robotics,
    );
    if (change === undefined) throw new Error("No change on the share");
    change.atMs = localInstant(day, "10:15:00");
    change.effectiveAt = new Date(change.atMs).toISOString();
    store.shares
      .find(({ id }) => id === robotics)
      ?.prices.push({
        atMs: localInstant(day, "12:00:00"),
        priceEur: "50.00",
        source: "close",
      });
    await act(() => queryClient.invalidateQueries());

    await vi.waitFor(() => expect(text()).toContain("Robotics ETF"));
    expect(text()).not.toContain("Can’t load this page");
  });

  it("says a manual share's page can't load when its values fail", async () => {
    const wind = fixtureShareId("wind");
    await visit(`/shares/${wind}`, "member", {
      failPath: `/shares/${wind}/values`,
    });

    await vi.waitFor(() => expect(text()).toContain("Can’t load this page"));
    expect(button(/^Retry$/)).toBeTruthy();
  });

  it("shows a value's new price in the list when a deletion finds it changed", async () => {
    const wind = fixtureShareId("wind");
    const { store } = await visit(`/shares/${wind}`, "member");
    const value = store.shares.find(({ id }) => id === wind)?.prices.at(-1);
    if (value === undefined) throw new Error("No value to delete");

    const firstRow = () =>
      [...document.body.querySelectorAll("section")]
        .find(
          (section) => section.querySelector("h2")?.textContent === "Values",
        )
        ?.querySelector<HTMLElement>("ol > li");
    await vi.waitFor(() => expect(firstRow()?.textContent).toContain("€53.10"));
    value.priceEur = "60.00";
    await click(
      () => firstRow()?.querySelector("button"),
      () => expect(text()).toContain("Delete"),
    );
    await click(
      () =>
        [
          ...document.body.querySelectorAll<HTMLElement>("[role=menuitem]"),
        ].find((item) => item.textContent?.startsWith("Delete")),
      () => expect(text()).toContain("Robin Leclerc changed it to €60.00"),
    );
    await vi.waitFor(() => expect(firstRow()?.textContent).toContain("€60.00"));
    expect(value.priceEur).toBe("60.00");
  });

  it("keeps a manual share's last value: its Delete is off and says why", async () => {
    const wind = fixtureShareId("wind");
    const { queryClient, store } = await visit(`/shares/${wind}`, "member");
    const share = store.shares.find(({ id }) => id === wind);
    share?.prices.splice(0, share.prices.length - 1);
    await act(() => queryClient.invalidateQueries());

    const rows = () => [
      ...([...document.body.querySelectorAll("section")]
        .find(
          (section) => section.querySelector("h2")?.textContent === "Values",
        )
        ?.querySelectorAll<HTMLElement>("ol > li") ?? []),
    ];
    await vi.waitFor(() => expect(rows()).toHaveLength(1));
    await click(
      () => rows()[0]?.querySelector("button"),
      () => expect(text()).toContain("A manual share keeps at least one value"),
    );
    const remove = [
      ...document.body.querySelectorAll<HTMLElement>("[role=menuitem]"),
    ].find((item) => item.textContent?.startsWith("Delete"));
    expect(remove?.getAttribute("aria-disabled")).toBe("true");
  });

  it("adds a share found by a lookup from Record a change's Which share, then asks when", async () => {
    await visit("/portfolio/record?kind=buy&step=share&start=what", "member");

    await vi.waitFor(() => expect(text()).toContain("Which share?"));
    typeInto(
      document.body.querySelector<HTMLInputElement>('input[type="search"]'),
      "water",
    );
    await click(
      () => button(/^Look up/),
      () => expect(text()).toContain("Water Utilities ETF"),
    );
    await click(
      () => button(/^Add$/),
      () => expect(text()).toContain("When?"),
    );
  });
});
