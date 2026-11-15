import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../lib/i18n";
import type { Language } from "../../lib/language";
import { Chip } from "./chip";

function render(node: ReactNode, language: Language = "en"): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={createI18n(language)}>{node}</I18nextProvider>,
  );
}

describe("Chip", () => {
  it("names what it holds, without a gain by default", () => {
    const markup = render(<Chip>IE00EXMPL001</Chip>);
    expect(markup).toContain("IE00EXMPL001");
    expect(markup).not.toContain("%");
  });

  it("writes a gain with its sign, in green", () => {
    const markup = render(<Chip gain="12.4">Swiss Pharma AG</Chip>);
    expect(markup).toContain(
      '<span class="tabular-nums text-positive">+12.4%</span>',
    );
  });

  it("writes a loss with the minus sign, in red", () => {
    const markup = render(<Chip gain="-1.3">Nordic Wind AG</Chip>);
    expect(markup).toContain(
      '<span class="tabular-nums text-negative">−1.3%</span>',
    );
  });

  it("writes a gain that rounds to zero unsigned, in grey", () => {
    const markup = render(<Chip gain="0.04">Nordic Wind AG</Chip>);
    expect(markup).toContain(
      '<span class="tabular-nums text-secondary">0.0%</span>',
    );
  });

  it("writes the gain in the reader's language", () => {
    const markup = render(<Chip gain="12.4">Swiss Pharma AG</Chip>, "fr");
    expect(markup).toContain("+12,4 %");
  });

  it("tightens its start around a picture", () => {
    const plain = render(<Chip>Lea</Chip>);
    const withPicture = render(<Chip picture={<span>L</span>}>Lea</Chip>);
    expect(plain).toContain("pl-[0.6875rem]");
    expect(withPicture).toContain("pl-[0.1875rem]");
    expect(withPicture).toContain("<span>L</span>Lea");
  });
});
