import type { ReactNode } from "react";
import { renderToStaticMarkup as renderBare } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../lib/i18n";
import { Picture, type PictureSize } from "./picture";

const i18n = createI18n("en");

/** Renders inside the app's i18n provider, which gives the initial its language. */
function renderToStaticMarkup(node: ReactNode): string {
  return renderBare(<I18nextProvider i18n={i18n}>{node}</I18nextProvider>);
}

describe("Picture", () => {
  it("is an image named by the person's name, with their initial", () => {
    const markup = renderToStaticMarkup(
      <Picture name="Sam" color="vermilion" size="s" />,
    );
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Sam"');
    expect(markup).toContain(">S</span>");
  });

  it("keeps an accented initial whole", () => {
    const markup = renderToStaticMarkup(
      <Picture name="élodie" color="green" size="s" />,
    );
    expect(markup).toContain(">É</span>");
  });

  it("sits on the pastel of the person's colour", () => {
    const markup = renderToStaticMarkup(
      <Picture name="Alex" color="cobalt" size="s" />,
    );
    expect(markup).toContain("bg-cobalt-pastel");
  });

  it("shows the initial while the photo loads", () => {
    const markup = renderToStaticMarkup(
      <Picture name="Sam" color="vermilion" size="s" photo="/sam.webp" />,
    );
    expect(markup).toContain(">S</span>");
  });

  it("sizes 20, 28, 48 and 88 px", () => {
    const sizes: readonly [PictureSize, string][] = [
      ["xs", "1.25rem"],
      ["s", "1.75rem"],
      ["m", "3rem"],
      ["l", "5.5rem"],
    ];
    for (const [size, rem] of sizes) {
      const markup = renderToStaticMarkup(
        <Picture name="Sam" color="vermilion" size={size} />,
      );
      expect(markup).toContain(`size-[${rem}]`);
    }
  });

  it("rings a medal on tablet and desktop only", () => {
    const markup = renderToStaticMarkup(
      <Picture name="Sam" color="vermilion" size="s" medal="gold" />,
    );
    expect(markup).toContain("outline-gold");
    expect(markup).toContain("outline-0 tablet:outline-3 desktop:outline-3");
  });

  it("has no ring without a medal", () => {
    const markup = renderToStaticMarkup(
      <Picture name="Sam" color="vermilion" size="s" />,
    );
    expect(markup).not.toContain("outline");
  });

  it("can be hidden from screen readers when the name is beside it", () => {
    const markup = renderToStaticMarkup(
      <Picture name="Sam" color="vermilion" size="s" aria-hidden />,
    );
    expect(markup).toContain('aria-hidden="true"');
  });
});
