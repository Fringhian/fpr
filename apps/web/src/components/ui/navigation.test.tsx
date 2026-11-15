import { StarIcon } from "@phosphor-icons/react/Star";
import type { ReactNode } from "react";
import { renderToStaticMarkup as renderBare } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../lib/i18n";
import * as Navigation from "./navigation";

const i18n = createI18n("en");

function renderToStaticMarkup(node: ReactNode): string {
  return renderBare(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>);
}

const account = { name: "Alex", color: "cobalt" } as const;

describe("destinationsFor", () => {
  it("gives the admin every item and the admin group", () => {
    expect(Navigation.destinationsFor("admin")).toEqual({
      main: ["home", "members", "portfolio", "shares"],
      admin: ["people", "trackedShares"],
    });
  });

  it("gives a member the four items and no admin group", () => {
    expect(Navigation.destinationsFor("member")).toEqual({
      main: ["home", "members", "portfolio", "shares"],
      admin: [],
    });
  });

  it("gives a guest no Portfolio and no admin group", () => {
    expect(Navigation.destinationsFor("guest")).toEqual({
      main: ["home", "members", "shares"],
      admin: [],
    });
  });

  it("gives an anonymous viewer no Portfolio, and the admin area to read", () => {
    expect(Navigation.destinationsFor("anonymous")).toEqual({
      main: ["home", "members", "shares"],
      admin: ["people", "trackedShares"],
    });
  });
});

describe("Navigation", () => {
  it("marks the current item as the page, alone", () => {
    const markup = renderToStaticMarkup(
      <Navigation.Root userRole="member" current="members" account={account}>
        <Navigation.TabBar />
      </Navigation.Root>,
    );
    expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
    expect(markup).toMatch(/<a href="\/members"[^>]*aria-current="page"/);
  });

  it("links each item to its page with a plain link by default", () => {
    const markup = renderToStaticMarkup(
      <Navigation.Root userRole="admin" account={account}>
        <Navigation.Side />
      </Navigation.Root>,
    );
    for (const href of [
      "/",
      "/members",
      "/portfolio",
      "/shares",
      "/admin/people",
      "/admin/shares",
    ]) {
      expect(markup).toContain(`href="${href}"`);
    }
    expect(markup).not.toContain("aria-current");
  });

  it("renders each link through renderLink", () => {
    const markup = renderToStaticMarkup(
      <Navigation.Root
        userRole="guest"
        current="home"
        account={account}
        renderLink={({ target, href }) => (
          // biome-ignore lint/a11y/useAnchorContent: the navigation merges the item's content into it.
          <a href={`#${href}`} data-target={target} />
        )}
      >
        <Navigation.TabBar />
      </Navigation.Root>,
    );
    expect(markup).toContain('href="#/members" data-target="members"');
    expect(markup).toMatch(/data-target="home"[^>]*aria-current="page"/);
    expect(markup).not.toContain("portfolio");
  });

  it("draws the icon an item is given", () => {
    const withStar = renderToStaticMarkup(
      <Navigation.Root userRole="member" account={account} homeIcon={StarIcon}>
        <Navigation.TabBar />
      </Navigation.Root>,
    );
    const byDefault = renderToStaticMarkup(
      <Navigation.Root userRole="member" account={account}>
        <Navigation.TabBar />
      </Navigation.Root>,
    );
    expect(withStar).not.toEqual(byDefault);
  });

  it("names the account button by the person", () => {
    const markup = renderToStaticMarkup(
      <Navigation.Root userRole="member" account={account}>
        <Navigation.TopBar title="Home" />
      </Navigation.Root>,
    );
    expect(markup).toContain('aria-label="Alex, your account"');
  });
});
