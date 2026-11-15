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
    expect(render(<Swatch.Item color="cobalt" />)).toContain(
      'aria-label="Cobalt"',
    );
    expect(render(<Swatch.Item color="lime" />, "fr")).toContain(
      'aria-label="Citron vert"',
    );
  });

  it("names its owner when taken, and shows their initial", () => {
    const markup = render(<Swatch.Item color="vermilion" takenBy="sam" />);
    expect(markup).toContain('aria-label="Vermilion, taken by sam"');
    expect(markup).toContain(">S</span>");
  });

  it("takes className as a string or as a function of its state", () => {
    expect(render(<Swatch.Item color="cyan" className="mx-s" />)).toMatch(
      /role="radio"[^>]*class="[^"]*mx-s|class="[^"]*mx-s[^"]*"[^>]*role="radio"/,
    );
    const byState = (state: { disabled: boolean }) =>
      state.disabled ? "is-off" : "is-on";
    expect(
      render(<Swatch.Item color="cyan" disabled className={byState} />),
    ).toContain("is-off");
  });

  it("ignores a blank owner", () => {
    const markup = render(<Swatch.Item color="green" takenBy="  " />);
    expect(markup).toContain('aria-label="Green"');
    expect(markup).not.toContain("opacity-[0.35]");
  });
});
