import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../lib/i18n";
import type { Language } from "../../lib/language";
import { Badge, type BadgeState } from "./badge";

function render(state: BadgeState, language: Language = "en"): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={createI18n(language)}>
      <Badge state={state} />
    </I18nextProvider>,
  );
}

describe("Badge", () => {
  it("names its state in the reader's language", () => {
    expect(render("pricePending")).toContain(">Price pending<");
    expect(render("pricePending", "fr")).toContain(">Cours en attente<");
  });

  it("colours each state by what it means", () => {
    expect(render("manual")).toContain("text-secondary");
    expect(render("waitingForFirstUse")).toContain("text-secondary");
    expect(render("active")).toContain("text-success");
    expect(render("saved")).toContain("text-success");
    expect(render("pricePending")).toContain("text-warning");
    expect(render("incomplete")).toContain("text-warning");
    expect(render("revoked")).toContain("text-warning");
    expect(render("heldBefore")).toContain("bg-highlight text-on-sky");
  });
});
