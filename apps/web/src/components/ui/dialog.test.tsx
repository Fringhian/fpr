import { ArrowLeftIcon } from "@phosphor-icons/react/ArrowLeft";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../lib/i18n";
import type { Language } from "../../lib/language";
import * as Dialog from "./dialog";

function render(element: ReactElement, language: Language = "en"): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={createI18n(language)}>
      <Dialog.Root>{element}</Dialog.Root>
    </I18nextProvider>,
  );
}

describe("Dialog", () => {
  it("opens from a trigger that says it opens a dialog", () => {
    const markup = render(<Dialog.Trigger>Settings</Dialog.Trigger>);
    expect(markup).toContain('aria-haspopup="dialog"');
    expect(markup).toContain('aria-expanded="false"');
  });

  it("names its close button in the reader’s language", () => {
    expect(render(<Dialog.Close />)).toContain('aria-label="Close"');
    expect(render(<Dialog.Close />, "fr")).toContain('aria-label="Fermer"');
  });

  it("draws any icon on its close button, a cross by default", () => {
    const cross = render(<Dialog.Close />);
    const arrow = render(<Dialog.Close icon={ArrowLeftIcon} />);

    expect(arrow).toMatch(/<svg/);
    expect(arrow).not.toBe(cross);
    expect(render(<Dialog.Close icon={undefined} />)).toBe(cross);
  });

  it("takes className on its close and cancel buttons, as a string or a function", () => {
    expect(render(<Dialog.Close className="ms-auto" />)).toMatch(
      /<button[^>]*class="[^"]*ms-auto/,
    );
    expect(render(<Dialog.Cancel className={() => "is-cancel"} />)).toMatch(
      /<button[^>]*class="[^"]*is-cancel/,
    );
  });

  it("labels its cancel button, or takes another label", () => {
    expect(render(<Dialog.Cancel />)).toMatch(/>Cancel</);
    expect(render(<Dialog.Cancel />, "fr")).toMatch(/>Annuler</);
    expect(render(<Dialog.Cancel>Keep it</Dialog.Cancel>)).toMatch(/>Keep it</);
  });

  it("renders nothing until it opens", () => {
    const markup = render(
      <Dialog.Popup>
        <Dialog.Title>Settings</Dialog.Title>
      </Dialog.Popup>,
    );
    expect(markup).not.toContain("Settings");
  });
});
