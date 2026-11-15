import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../lib/i18n";
import type { Language } from "../../lib/language";
import { PeriodControl, periods, units } from "./period-control";

function render(element: ReactElement, language: Language = "en"): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={createI18n(language)}>{element}</I18nextProvider>,
  );
}

const ignore = () => {};

/** The `<button>` whose text is `label` (no regex characters), with its attributes. */
function button(markup: string, label: string): string {
  const match = markup.match(new RegExp(`<button[^>]*>${label}</button>`));
  if (match === null) throw new Error(`No button labelled ${label}`);
  return match[0];
}

describe("PeriodControl", () => {
  it("lines up with the API’s periods and units", () => {
    expect(periods).toEqual(["1D", "1W", "1M", "3M", "YTD", "all"]);
    expect(units).toEqual(["eur", "percent"]);
  });

  it("names the setting on the phone capsule, in the reader’s language", () => {
    const value = { period: "1M", unit: "percent" } as const;
    expect(render(<PeriodControl value={value} onChange={ignore} />)).toContain(
      "This month · %",
    );
    expect(
      render(<PeriodControl value={value} onChange={ignore} />, "fr"),
    ).toContain("Ce mois-ci · %");
  });

  it("selects the period and the unit it is given", () => {
    const markup = render(
      <PeriodControl value={{ period: "3M", unit: "eur" }} onChange={ignore} />,
    );
    expect(button(markup, "3M")).toContain('aria-pressed="true"');
    expect(button(markup, "1M")).toContain('aria-pressed="false"');
    expect(button(markup, "€")).toContain('aria-pressed="true"');
  });

  it("shows an anonymous viewer % only, with € disabled", () => {
    const markup = render(
      <PeriodControl
        value={{ period: "1W", unit: "eur" }}
        onChange={ignore}
        anonymous
      />,
    );
    expect(markup).toContain("This week · %");
    expect(button(markup, "€")).toContain("disabled");
    expect(button(markup, "%")).toContain('aria-pressed="true"');
  });

  it("fills its capsules for the sky by default, or for snow", () => {
    const value = { period: "1M", unit: "percent" } as const;
    const sky = render(<PeriodControl value={value} onChange={ignore} />);
    const snow = render(
      <PeriodControl value={value} onChange={ignore} backdrop="snow" />,
    );
    expect(sky).toContain("bg-surface/75");
    expect(sky).not.toContain("bg-divider/50");
    expect(snow).toContain("bg-divider/50");
    expect(snow).not.toContain("bg-surface/75");
  });
});
