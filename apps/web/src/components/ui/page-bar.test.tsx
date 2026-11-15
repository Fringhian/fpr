import { HouseIcon } from "@phosphor-icons/react/House";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../lib/i18n";
import * as PageBar from "./page-bar";

function render(element: ReactElement, language: "en" | "fr" = "en"): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={createI18n(language)}>{element}</I18nextProvider>,
  );
}

describe("PageBar", () => {
  it("writes the title as a paragraph, or as the heading it is given", () => {
    expect(render(<PageBar.Title>Home</PageBar.Title>)).toMatch(
      /^<p class="[^"]*">Home<\/p>$/,
    );
    expect(
      render(
        <PageBar.Title render={(props) => <h1 {...props} />}>
          Members
        </PageBar.Title>,
      ),
    ).toMatch(/^<h1 class="[^"]*">Members<\/h1>$/);
  });

  it("names the back link for screen readers, in each language", () => {
    const en = render(<PageBar.Back href="/members">Members</PageBar.Back>);
    expect(en).toMatch(/^<a href="\/members"/);
    expect(en).toContain('<span class="sr-only">Back to</span> Members');
    const fr = render(
      <PageBar.Back href="/members">Membres</PageBar.Back>,
      "fr",
    );
    expect(fr).toContain('<span class="sr-only">Retour vers</span> Membres');
  });

  it("leads the back link with a caret, or the icon it is given", () => {
    const caret = render(<PageBar.Back href="/">Shares</PageBar.Back>);
    const house = render(
      <PageBar.Back href="/" icon={HouseIcon}>
        Shares
      </PageBar.Back>,
    );
    expect(caret).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(house).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(house).not.toBe(caret);
  });

  it("renders the back link through the router's element", () => {
    const markup = render(
      <PageBar.Back render={<button type="button" />}>Members</PageBar.Back>,
    );
    expect(markup).toMatch(/^<button type="button"/);
  });

  it("hides the page's name after the back link on phone, and its slash from screen readers", () => {
    const markup = render(<PageBar.Current>Sam</PageBar.Current>);
    expect(markup).toMatch(/^<p class="[^"]*\bhidden\b[^"]*\btablet:flex\b/);
    expect(markup).toContain('<span aria-hidden="true"');
    expect(markup).toContain(">Sam</span>");
  });

  it("keeps a class passed in", () => {
    expect(render(<PageBar.Root className="mt-l" />)).toContain("mt-l");
    expect(render(<PageBar.Controls className="gap-m" />)).toContain("gap-m");
  });
});
