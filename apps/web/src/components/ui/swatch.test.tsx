import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../lib/i18n";
import type { Language } from "../../lib/language";
import * as Swatch from "./swatch";

function render(node: ReactNode, language: Language = "en"): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={createI18n(language)}>
      <Swatch.Group aria-label="Colour">{node}</Swatch.Group>
    </I18nextProvider>,
  );
}

describe("Swatch.Item", () => {
  it("is named by its colour", () => {
    expect(render(<Swatch.Item colour="cobalt" />)).toContain(
      'aria-label="Cobalt"',
    );
    expect(render(<Swatch.Item colour="lime" />, "fr")).toContain(
      'aria-label="Citron vert"',
    );
  });

  it("names its owner when taken, and shows their initial", () => {
    const markup = render(<Swatch.Item colour="vermilion" takenBy="sam" />);
    expect(markup).toContain('aria-label="Vermilion, taken by sam"');
    expect(markup).toContain(">S</span>");
  });

  it("ignores a blank owner", () => {
    const markup = render(<Swatch.Item colour="green" takenBy="  " />);
    expect(markup).toContain('aria-label="Green"');
    expect(markup).not.toContain("opacity-[0.35]");
  });
});
