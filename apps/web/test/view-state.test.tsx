// @vitest-environment happy-dom
import { act } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fixturePersonId } from "../src/mocks/fixtures/people.ts";
import { visit } from "./visit-app.tsx";

const KEY = "fpr.periodSetting.v1";

/** Keeps a setting as an earlier visit or another tab would, which the app reads again. */
function keep(setting: Record<string, string>) {
  localStorage.setItem(KEY, JSON.stringify(setting));
  window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
}

/** The first bar's segment named `label`, and its pressed option. */
function segment(page: HTMLElement, label: "Period" | "Unit") {
  const group = page.querySelector(`[aria-label="${label}"]`);
  return {
    group,
    pressed: group?.querySelector('[aria-pressed="true"]')?.textContent,
    option: (name: string) =>
      [...(group?.querySelectorAll("button") ?? [])].find(
        (button) => button.textContent === name,
      ),
  };
}

beforeEach(() => {
  localStorage.clear();
  window.dispatchEvent(new StorageEvent("storage", { key: null }));
});

describe("the period and unit", () => {
  it("fall back to the default and are written in the address", async () => {
    const { location, page } = await visit("/members", "member");
    expect(location.search).toEqual({ period: "1M", unit: "percent" });
    expect(segment(page, "Period").pressed).toBe("1M");
  });

  it("come from localStorage when the address has none", async () => {
    keep({ period: "3M", unit: "eur" });
    const { location } = await visit("/shares", "member");
    expect(location.search).toEqual({ period: "3M", unit: "eur" });
  });

  it("come from the address first, which leaves localStorage alone", async () => {
    keep({ period: "3M", unit: "eur" });
    const { location } = await visit("/?period=YTD&unit=percent", "member");
    expect(location.search).toMatchObject({ period: "YTD", unit: "percent" });
    expect(JSON.parse(localStorage.getItem(KEY) ?? "")).toEqual({
      period: "3M",
      unit: "eur",
    });
  });

  it("fall back one by one when a value isn't valid", async () => {
    keep({ period: "1W", unit: "dollars" });
    const { location } = await visit("/?period=2Y&unit=usd", "member");
    expect(location.search).toMatchObject({ period: "1W", unit: "percent" });
  });

  it("change in the address and in localStorage, and every link keeps them", async () => {
    const { router, page } = await visit("/?period=1M&unit=eur", "member");
    await act(async () => segment(page, "Period").option("1W")?.click());
    expect(router.state.location.search).toMatchObject({
      period: "1W",
      unit: "eur",
    });
    expect(JSON.parse(localStorage.getItem(KEY) ?? "")).toEqual({
      period: "1W",
      unit: "eur",
    });
    const members = page.querySelector('nav a[href^="/members"]');
    expect(members?.getAttribute("href")).toBe("/members?period=1W&unit=eur");
  });

  it("are always in percent for an anonymous viewer, who has no € / % and leaves the device's unit alone", async () => {
    keep({ period: "1M", unit: "eur" });
    const { router, page } = await visit("/", "anonymous");
    expect(segment(page, "Unit").group).toBeNull();
    await act(async () => segment(page, "Period").option("3M")?.click());
    expect(router.state.location.search).toMatchObject({
      period: "3M",
      unit: "percent",
    });
    expect(JSON.parse(localStorage.getItem(KEY) ?? "")).toEqual({
      period: "3M",
      unit: "eur",
    });
  });
});

describe("each page's own view", () => {
  const sam = fixturePersonId("sam");

  it("keeps Home's focused member and standings, and drops invalid ones", async () => {
    const kept = await visit(`/?focus=${sam}&standings=balance`, "member");
    expect(kept.search).toMatchObject({ focus: sam, standings: "balance" });

    const invalid = await visit("/?focus=sam&standings=best", "member");
    expect(invalid.search).toMatchObject({
      focus: undefined,
      standings: undefined,
    });
  });

  it("shows Home's focused member from the address, and a lane pressed focuses its member", async () => {
    const robin = fixturePersonId("robin");
    const { router, page } = await visit(`/?focus=${robin}`, "member");
    const panelTitle = () =>
      [...page.querySelectorAll("section")]
        .find((section) => section.textContent?.includes("What moved"))
        ?.querySelector("h2")?.textContent;
    await vi.waitFor(() => expect(panelTitle()).toBe("Robin Leclerc"));

    const lane = page.querySelector<HTMLButtonElement>(
      `li[data-member="${fixturePersonId("jordan")}"] button`,
    );
    await act(async () => lane?.click());
    expect(router.state.location.search).toMatchObject({
      focus: fixturePersonId("jordan"),
    });
    await vi.waitFor(() => expect(panelTitle()).toBe("Jordan Petit"));
  });

  it("shows Home's standings switch on the board its lanes are from while the next one loads", async () => {
    const { page, release } = await visit("/", "member", {
      hold: (url) => url.pathname.endsWith("/leaderboards/balance"),
    });
    const board = () =>
      page.querySelector('[aria-label="Standings by"] [aria-pressed="true"]')
        ?.textContent;
    const lanes = () =>
      page.querySelector("ol li[data-member]")?.closest("section");
    await vi.waitFor(() => expect(lanes()).toBeTruthy());

    const balance = [
      ...page.querySelectorAll('[aria-label="Standings by"] button'),
    ].find((button) => button.textContent === "Balance");
    await act(async () => (balance as HTMLButtonElement | undefined)?.click());
    expect(board()).toBe("Gain");
    expect(lanes()?.getAttribute("aria-busy")).toBe("true");

    await release();
    await vi.waitFor(() => expect(board()).toBe("Balance"));
    expect(lanes()?.textContent).toContain("€");
    expect(lanes()?.getAttribute("aria-busy")).toBeNull();
  });

  it("never shows a member's holdings under another member's page while theirs load", async () => {
    const robin = fixturePersonId("robin");
    const { router, page, release } = await visit(`/members/${sam}`, "guest", {
      hold: (url) => url.pathname.includes(`/users/${robin}/`),
    });
    await vi.waitFor(() => expect(page.textContent).toContain("Clean Energy"));

    await act(() =>
      router.navigate({ to: "/members/$userId", params: { userId: robin } }),
    );
    expect(page.querySelector("h1")?.textContent).toContain("Robin Leclerc");
    expect(page.textContent).not.toContain("Clean Energy");

    await release();
    await vi.waitFor(() => expect(page.textContent).toContain("Small Caps"));
  });

  it("keeps the Shares search as typed, spaces included, and drops a blank one", async () => {
    const { search, location } = await visit("/shares?q=World%20", "guest");
    expect(search).toMatchObject({ q: "World " });
    // The address the router writes back reads the same text again.
    expect((await visit(location.href, "guest")).search).toMatchObject({
      q: "World ",
    });
    expect((await visit("/shares?q=%20", "guest")).search).toMatchObject({
      q: undefined,
    });
  });
});
