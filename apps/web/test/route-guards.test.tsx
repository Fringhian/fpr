// @vitest-environment happy-dom
import { act } from "react";
import { describe, expect, it, vi } from "vitest";
import { fixturePersonId } from "../src/mocks/fixtures/people.ts";
import { fixtureShares } from "../src/mocks/fixtures/shares.ts";
import type { Persona } from "../src/mocks/personas.ts";
import { setSession } from "../src/mocks/store/session.ts";
import { visit } from "./visit-app.tsx";

const userId = fixturePersonId("sam");
// Add a value opens only on a manual share: one with value points.
const manualShare = fixtureShares.find((share) => "values" in share);

/** Every route, by the address a visit asks for. */
const routes = {
  home: "/",
  members: "/members",
  // Someone else's page: the member persona's own is their Portfolio.
  member: `/members/${fixturePersonId("robin")}`,
  memberRecord: `/members/${userId}/record`,
  memberHistory: `/members/${userId}/history`,
  portfolio: "/portfolio",
  portfolioRecord: "/portfolio/record",
  portfolioHistory: "/portfolio/history",
  shares: "/shares",
  share: "/shares/0b8a4c62-5d1e-4f0a-9c3e-2a7f6b1d9e40",
  newShare: "/shares/new",
  shareValue: `/shares/${manualShare?.id}/value`,
  help: "/help",
  people: "/admin/people",
  trackedShares: "/admin/shares",
  // Addresses no page answers, inside a guarded area.
  adminNowhere: "/admin/nowhere",
  portfolioNowhere: "/portfolio/nowhere",
  signIn: "/sign-in",
  setup: "/setup",
  access: "/access/some-key",
  resetPassword: "/reset-password",
  onboarding: "/onboarding",
} as const;

type Page = keyof typeof routes;

const pages = Object.keys(routes) as Page[];
const everyday = ["home", "members", "member", "shares", "share", "help"];
// The pages that write: a portfolio's, and a manual share's.
const writes = [
  "portfolio",
  "portfolioRecord",
  "portfolioHistory",
  "portfolioNowhere",
  "newShare",
  "shareValue",
];
const adminArea = ["people", "trackedShares", "adminNowhere"];

/** The pages each onboarded persona enters; every other page leads Home. */
const enters = {
  admin: [
    ...everyday,
    ...writes,
    ...adminArea,
    "memberRecord",
    "memberHistory",
  ],
  member: [...everyday, ...writes],
  guest: everyday,
  anonymous: [...everyday, ...adminArea],
} satisfies Partial<Record<Persona, readonly string[]>>;

describe("the route guards", () => {
  it("visit Add a value on a manual share", () => {
    expect(manualShare).toBeDefined();
  });

  describe.each(Object.keys(enters) as (keyof typeof enters)[])(
    "for the %s",
    (persona) => {
      it.each(pages)("lead from %s where the role may go", async (page) => {
        const allowed: readonly string[] = enters[persona];
        const { location } = await visit(routes[page], persona);
        expect(location.pathname).toBe(
          allowed.includes(page) ? routes[page] : "/",
        );
      });
    },
  );

  it("send a signed-out visitor to sign-in, which leads back to the page asked for", async () => {
    const { location, search } = await visit("/shares?q=world", "signedOut");
    expect(location.pathname).toBe("/sign-in");
    expect(search).toEqual({ redirect: "/shares?q=world" });
    expect((await visit("/", "signedOut")).location.href).toBe("/sign-in");
    expect((await visit("/onboarding", "signedOut")).location.pathname).toBe(
      "/sign-in",
    );
  });

  it("let a signed-out visitor reach every page that starts a session", async () => {
    for (const page of ["signIn", "setup", "resetPassword"] as const) {
      expect((await visit(routes[page], "signedOut")).location.href).toBe(
        routes[page],
      );
    }
    // An access link's key leaves the address as the link opens.
    expect((await visit(routes.access, "signedOut")).location.href).toBe(
      "/access",
    );
  });

  it("keep sign-in's redirect inside the app", async () => {
    // `//`, `/\`, and a tab or a line feed the browser drops from `/\t/`.
    for (const elsewhere of ["//", "/%5C", "/%09/", "/%0A/", "https://"]) {
      const { search } = await visit(
        `/sign-in?redirect=${elsewhere}elsewhere.example`,
        "signedOut",
      );
      expect(search).toEqual({});
    }
  });

  it("open a member's own page on their Portfolio", async () => {
    const { location } = await visit(`/members/${userId}`, "member");
    expect(location.pathname).toBe("/portfolio");
  });

  it("send a person whose onboarding isn't finished to it from every other page", async () => {
    for (const page of pages) {
      expect((await visit(routes[page], "newcomer")).location.href).toBe(
        "/onboarding",
      );
    }
  });

  it("sign out a person whose access has ended, and tell them on sign-in", async () => {
    const ended = await visit("/portfolio", fixturePersonId("sacha"));
    expect(ended.onAccessEnded).toHaveBeenCalled();
    expect(ended.location.pathname).toBe("/sign-in");

    const { text } = await visit("/sign-in?access=ended", "signedOut");
    expect(text).toContain("Your access has ended");
    expect(text).toContain("Ask the admin if you think this is a mistake.");
  });

  it("send a person whose session expires mid-visit to sign-in, keeping the shell until then", async () => {
    const { router, page, queryClient, store, onSessionExpired } = await visit(
      "/shares?q=world",
      "member",
    );
    setSession(store, null);
    await act(() => queryClient.invalidateQueries());
    expect(onSessionExpired).toHaveBeenCalled();
    expect(page.querySelector("nav")).not.toBeNull();
    expect(page.textContent).not.toContain("Can’t load this page");

    await act(() => router.navigate({ to: "/members" }));
    expect(router.state.location.pathname).toBe("/sign-in");
    expect(router.state.location.search).toEqual({
      redirect: "/members?period=1M&unit=percent",
    });
  });

  it("leave a signed-out visitor's session alone", async () => {
    const { onSessionExpired } = await visit("/shares", "signedOut");
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("open the admin area on People", async () => {
    expect((await visit("/admin", "admin")).location.pathname).toBe(
      "/admin/people",
    );
  });

  it("show Page not found at an address no route answers, inside the app shell", async () => {
    for (const path of ["/nowhere", "/admin/nowhere", `/members/${userId}/x`]) {
      const { location, text, page } = await visit(path, "admin");
      expect(location.pathname).toBe(path);
      // The admin's own language is French.
      expect(text).toContain("Page introuvable");
      expect(page.querySelector("nav")).not.toBeNull();
    }
    const signedOut = await visit("/nowhere", "signedOut");
    expect(signedOut.location.pathname).toBe("/sign-in");
  });

  it("show Retry when the session can't load", async () => {
    const { text } = await visit("/", "member", { failMe: true });
    expect(text).toContain("Can’t load this page");
    expect(text).toContain("Retry");
  });

  it("say each screen is offline with no network, and load it again once back", async () => {
    const { router, page, setOnline } = await visit("/members", "member");
    await setOnline(false);
    await act(() => router.navigate({ to: "/portfolio" }));
    await vi.waitFor(() =>
      expect(page.textContent).toContain("You’re offline"),
    );
    expect(page.textContent).toContain("Retry");
    expect(page.querySelector("nav")).not.toBeNull();

    await setOnline(true);
    await vi.waitFor(() =>
      expect(page.textContent).toContain("Your portfolio is worth"),
    );
    expect(page.textContent).not.toContain("Retry");
  });

  it.each([
    routes.shares,
    routes.share,
    routes.shareValue,
    routes.portfolioHistory,
  ])("say %s is offline with no network", async (path) => {
    const { router, page, setOnline } = await visit("/members", "member");
    await setOnline(false);
    await act(() => router.navigate({ href: path }));
    await vi.waitFor(() =>
      expect(page.textContent).toContain("You’re offline"),
    );
  });

  it("open on You're offline with no network, and load by themselves once back", async () => {
    const { page, setOnline } = await visit("/members", "member", {
      offline: true,
    });
    expect(page.textContent).toContain("You’re offline");

    await setOnline(true);
    await vi.waitFor(() => expect(page.querySelector("nav")).not.toBeNull());
    expect(page.textContent).not.toContain("Retry");
  });
});
