// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { fixtureShareId } from "../src/mocks/fixtures/shares.ts";
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
    typeInto(field("isin"), "ie00 fprspc11");
    await click(
      () => button(/^Add share/),
      () => expect(router.state.location.pathname).not.toBe("/shares"),
    );

    const stored = store.shares.find((share) => share.isin === "IE00FPRSPC11");
    expect(stored).toMatchObject({ name: "Space Economy Fund" });
    expect(router.state.location.pathname).toBe(`/shares/${stored?.id}`);
  });

  it("looks a full ISIN up by itself, and adding what it finds opens it", async () => {
    const { router, store } = await visit("/shares?q=IE00FPRWTR10", "member");

    await click(
      () => button(/^Add$/),
      () => expect(router.state.location.pathname).not.toBe("/shares"),
    );
    const stored = store.shares.find((share) => share.isin === "IE00FPRWTR10");
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
      "/shares/new?isin=IE00FPRWLD01",
      "member",
    );
    const before = store.shares.length;

    typeInto(field("name"), "Example Fund");
    typeInto(field("price"), "40,10");
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
      "/shares/new?isin=LU00FPRNEW08",
      "member",
    );

    typeInto(field("name"), "Example Fund");
    typeInto(field("price"), "40,10");
    await submit(page, () =>
      expect(router.state.location.pathname).not.toBe("/shares/new"),
    );
    const stored = store.shares.find((share) => share.isin === "LU00FPRNEW08");
    expect(stored).toMatchObject({ name: "Example Fund", kind: "manual" });
    expect(stored?.prices[0]?.priceEur).toBe("40.10");
    expect(router.state.location.pathname).toBe(`/shares/${stored?.id}`);
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
