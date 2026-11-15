import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../lib/i18n";
import type { Language } from "../../lib/language";
import { AllocationBar } from "./allocation-bar";

function render(element: ReactElement, language: Language = "en"): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={createI18n(language)}>{element}</I18nextProvider>,
  );
}

const HOLDINGS = [
  { id: "alpha", name: "Alpha Index ETF", weight: "47.7" },
  { id: "beta", name: "Beta Tech Fund", weight: "24.1" },
  { id: "pending", name: "Nordic Pending AG", weight: null },
];

describe("AllocationBar", () => {
  it("names each part in the key with its percentage", () => {
    const markup = render(
      <AllocationBar color="cobalt" holdings={HOLDINGS} cashWeight="28.2" />,
    );
    expect(markup).toContain('aria-label="How it’s split"');
    expect(markup).toMatch(/Alpha Index ETF <span[^>]*>47\.7%<\/span>/);
    expect(markup).toMatch(/Beta Tech Fund <span[^>]*>24\.1%<\/span>/);
    expect(markup).toMatch(/Cash <span[^>]*>28\.2%<\/span>/);
    expect(markup).not.toContain("Nordic Pending AG");
  });

  it("draws the shares in the person's colour, lighter as they shrink, and the cash in grey", () => {
    const markup = render(
      <AllocationBar color="cobalt" holdings={HOLDINGS} cashWeight="28.2" />,
    );
    expect(markup).toContain("[--tone:var(--color-cobalt)]");
    expect(markup).toContain("var(--tone) 100%");
    expect(markup).toContain("var(--tone) 34%");
    expect(markup).toContain("bg-muted");
  });

  it("hides the bar from screen readers, the key carrying the parts", () => {
    const markup = render(
      <AllocationBar color="green" holdings={HOLDINGS} cashWeight={null} />,
    );
    expect(markup).toMatch(/<div aria-hidden="true" class="flex/);
    expect(markup.match(/<li /g)).toHaveLength(2);
  });

  it("speaks the reader's language", () => {
    const markup = render(
      <AllocationBar color="green" holdings={HOLDINGS} cashWeight="28.2" />,
      "fr",
    );
    expect(markup).toContain("Liquidités");
    expect(markup).toContain("47,7");
  });

  it("passes every other prop and its classes to its outer div", () => {
    const markup = render(
      <AllocationBar
        color="green"
        holdings={HOLDINGS}
        cashWeight="28.2"
        id="split"
        data-owner="alex"
        className="mt-l"
      />,
    );

    expect(markup).toMatch(/^<div[^>]*id="split"/);
    expect(markup).toMatch(/^<div[^>]*data-owner="alex"/);
    expect(markup).toMatch(/^<div[^>]*class="[^"]*mt-l/);
  });

  it("renders nothing with nothing to split", () => {
    expect(
      render(<AllocationBar color="green" holdings={[]} cashWeight={null} />),
    ).toBe("");
  });
});
