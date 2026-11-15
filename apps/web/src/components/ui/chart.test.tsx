import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../lib/i18n";
import { Chart, type ChartLine } from "./chart";

const i18n = createI18n("en");

function render(element: ReactElement): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>{element}</I18nextProvider>,
  );
}

const LINES: readonly ChartLine[] = [
  {
    id: "world-index",
    label: "World Index ETF",
    color: "primary",
    points: [
      { day: "2026-03-02", value: "100.00" },
      { day: "2026-03-03", value: "101.20" },
    ],
  },
];

describe("Chart", () => {
  it("names the line chart as a group the keyboard can reach", () => {
    const markup = render(
      <Chart lines={LINES} label="World Index ETF, price" unit="money" />,
    );

    expect(markup).toMatch(
      /role="group" aria-label="World Index ETF, price"[^>]*tabindex="0"/,
    );
  });

  it("names the sparkline as an image", () => {
    const markup = render(
      <Chart
        variant="sparkline"
        lines={LINES}
        label="World Index ETF, rising"
        unit="money"
      />,
    );

    expect(markup).toMatch(/^<div[^>]*role="img"/);
    expect(markup).toContain('aria-label="World Index ETF, rising"');
    expect(markup).not.toContain('role="group"');
  });

  it("passes every other prop and its classes to its outer div", () => {
    for (const variant of ["line", "sparkline"] as const) {
      const markup = render(
        <Chart
          variant={variant}
          lines={LINES}
          label="World Index ETF, price"
          unit="money"
          id="price-chart"
          data-period="month"
          className="h-[10rem]"
        />,
      );

      expect(markup).toMatch(/^<div[^>]*id="price-chart"/);
      expect(markup).toMatch(/^<div[^>]*data-period="month"/);
      expect(markup).toMatch(/^<div[^>]*class="[^"]*h-\[10rem\]/);
      expect(markup).not.toMatch(/h-\[13rem\]|h-\[2\.125rem\]/);
    }
  });
});
