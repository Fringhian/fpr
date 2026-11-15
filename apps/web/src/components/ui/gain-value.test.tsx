import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../lib/i18n";
import { GainChip } from "./gain-chip";
import { GainValue } from "./gain-value";

const i18n = createI18n("en");

function render(element: ReactElement): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>{element}</I18nextProvider>,
  );
}

describe.each([
  ["GainValue", GainValue],
  ["GainChip", GainChip],
])("%s", (_, Part) => {
  it("writes a gain with its plus sign, in green", () => {
    const markup = render(
      <Part gain={{ eur: "512.40", percent: "4.2" }} unit="percent" />,
    );
    expect(markup).toContain(">+4.2%<");
    expect(markup).toContain("text-positive");
  });

  it("writes a loss with the minus sign, in red", () => {
    const markup = render(
      <Part gain={{ eur: "-18.30", percent: "-1.3" }} unit="eur" />,
    );
    expect(markup).toContain(">−€18.30<");
    expect(markup).toContain("text-negative");
  });

  it("reads in percent for an anonymous viewer, whatever the unit", () => {
    const markup = render(<Part gain={{ percent: "4.2" }} unit="eur" />);
    expect(markup).toContain(">+4.2%<");
  });

  it("renders nothing with neither euros nor a percentage", () => {
    expect(render(<Part gain={{ percent: null }} unit="percent" />)).toBe("");
  });

  it("passes every other prop to its span", () => {
    const markup = render(
      <Part
        gain={{ percent: "4.2" }}
        unit="percent"
        id="gain"
        className="text-xl"
      />,
    );
    expect(markup).toMatch(/<span id="gain" class="[^"]*text-xl/);
  });
});
