import { TrayIcon } from "@phosphor-icons/react/Tray";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../lib/i18n";
import { LoadingPlaceholder } from "./loading-placeholder";
import { MarketStatus } from "./market-status";
import { StateIcon } from "./state-icon";
import { StepProgress } from "./step-progress";

const i18n = createI18n("en");

function render(element: ReactElement): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>{element}</I18nextProvider>,
  );
}

describe("MarketStatus", () => {
  it("says the markets are open, with the prices' time", () => {
    const markup = render(
      <MarketStatus
        status="open"
        pricedAt="2026-03-05T14:30:00Z"
        timeZone="UTC"
      />,
    );
    expect(markup).toContain("Markets open · prices as of 14:30");
    expect(markup).toContain("bg-positive");
  });

  it("says the markets are closed, with the close's day", () => {
    const markup = render(
      <MarketStatus
        status="closed"
        pricedAt="2026-03-05T17:30:00Z"
        timeZone="UTC"
      />,
    );
    expect(markup).toContain("Markets closed · close of Thu 5 Mar");
    expect(markup).toContain("bg-muted");
  });
});

describe("StepProgress", () => {
  it("is a progress bar read as the step of the flow", () => {
    const markup = render(<StepProgress step={2} count={4} />);
    expect(markup).toContain('role="progressbar"');
    expect(markup).toContain('aria-label="Progress"');
    expect(markup).toContain('aria-valuetext="Step 2 of 4"');
    expect(markup.match(/bg-primary/g)).toHaveLength(2);
    expect(markup.match(/bg-muted/g)).toHaveLength(2);
  });

  it("takes className as a function of Base UI's state", () => {
    const markup = render(
      <StepProgress
        step={4}
        count={4}
        className={(state) => `is-${state.status}`}
      />,
    );
    expect(markup).toMatch(/class="[^"]*flex[^"]*is-complete/);
  });
});

describe("LoadingPlaceholder", () => {
  it("is a status saying what loads, or “Loading…”", () => {
    expect(render(<LoadingPlaceholder />)).toMatch(
      /^<div role="status".*Loading…<\/div>$/,
    );
    expect(
      render(<LoadingPlaceholder>Loading its prices…</LoadingPlaceholder>),
    ).toContain("Loading its prices…</div>");
  });

  it("stays still for a reader who asks for reduced motion", () => {
    const markup = render(<LoadingPlaceholder />);
    expect(markup).toContain("animate-pulse motion-reduce:animate-none");
  });
});

describe("StateIcon", () => {
  it("hides its icon from screen readers without a label", () => {
    const markup = render(<StateIcon icon={TrayIcon} />);
    expect(markup).toContain('aria-hidden="true"');
    expect(markup).toContain("size-[3.5rem]");
  });

  it("names its icon with a label", () => {
    const markup = render(<StateIcon icon={TrayIcon} label="Nothing yet" />);
    expect(markup).toContain('role="img"');
    expect(markup).toContain('aria-label="Nothing yet"');
  });
});
