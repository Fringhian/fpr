import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../lib/i18n";
import * as Field from "./field";

const i18n = createI18n("en");

function render(element: ReactElement): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>{element}</I18nextProvider>,
  );
}

describe("Field", () => {
  it("shows the help while the field is valid, and no error", () => {
    const markup = render(
      <Field.Root>
        <Field.Label>Display name</Field.Label>
        <Field.Control />
        <Field.Description>Shown on the race.</Field.Description>
        <Field.Error>Enter a name.</Field.Error>
      </Field.Root>,
    );
    expect(markup).toContain("Shown on the race.");
    expect(markup).not.toContain("Enter a name.");
  });

  it("shows the error in place of the help while the field is invalid", () => {
    const markup = render(
      <Field.Root invalid>
        <Field.Label>Display name</Field.Label>
        <Field.Control />
        <Field.Description>Shown on the race.</Field.Description>
        <Field.Error>Enter a name.</Field.Error>
      </Field.Root>,
    );
    expect(markup).not.toContain("Shown on the race.");
    expect(markup).toMatch(/<div aria-live="polite"><div[^>]*>Enter a name\./);
  });

  it("hides the password behind a Show button that submits nothing", () => {
    const markup = render(
      <Field.Root>
        <Field.Label>Password</Field.Label>
        <Field.Password autoComplete="current-password" />
      </Field.Root>,
    );
    expect(markup).toContain('type="password"');
    expect(markup).toMatch(
      /<button[^>]*type="button"[^>]*aria-label="Show password"[^>]*>Show</,
    );
  });

  it("turns off Show with the field", () => {
    const markup = render(
      <Field.Root disabled>
        <Field.Label>Password</Field.Label>
        <Field.Password />
      </Field.Root>,
    );
    expect(markup).toMatch(/<button[^>]* disabled=""/);
  });
});
