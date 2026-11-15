import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../lib/i18n";
import { Button } from "./button";

const i18n = createI18n("en");

function render(element: ReactElement): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>{element}</I18nextProvider>,
  );
}

describe("Button", () => {
  it("is a plain button that submits nothing by default", () => {
    const markup = render(<Button>Sell</Button>);
    expect(markup).toContain('type="button"');
    expect(markup).not.toContain("aria-busy=");
    expect(markup).not.toContain("Saving…");
  });

  it("is disabled natively", () => {
    const markup = render(<Button disabled>Sell</Button>);
    expect(markup).toMatch(/<button[^>]* disabled=""/);
  });

  it("stays focusable while loading, busy and refusing presses", () => {
    const markup = render(<Button loading>Save change</Button>);
    expect(markup).toContain('aria-busy="true"');
    expect(markup).toContain('aria-disabled="true"');
    expect(markup).not.toMatch(/<button[^>]* disabled=""/);
    expect(markup).toContain("Saving…");
  });

  it("hides the label while loading and the loading label otherwise", () => {
    const busy = render(<Button loading>Save change</Button>);
    expect(busy).toMatch(/class="[^"]*invisible[^"]*">Save change/);
    const idle = render(<Button loading={false}>Save change</Button>);
    expect(idle).toMatch(/class="[^"]*invisible[^"]*">.*Saving…/);
    expect(idle).not.toMatch(/class="[^"]*invisible[^"]*">Save change/);
  });

  it("takes its own loading label", () => {
    const markup = render(
      <Button loading loadingLabel="Signing in…">
        Sign in
      </Button>,
    );
    expect(markup).toContain("Signing in…");
    expect(markup).not.toContain("Saving…");
  });

  it("draws the arrow only on a step button with a next step", () => {
    const arrow = /<svg/;
    expect(
      render(
        <Button size="step" next>
          Choose the date
        </Button>,
      ),
    ).toMatch(arrow);
    expect(render(<Button size="step">Save change</Button>)).not.toMatch(arrow);
    expect(
      render(
        <Button size="m" next>
          Sell
        </Button>,
      ),
    ).not.toMatch(arrow);
  });

  it("draws any icon for the next step", () => {
    const arrow = render(
      <Button size="step" next>
        Choose the date
      </Button>,
    );
    const caret = render(
      <Button size="step" next nextIcon={CaretRightIcon}>
        Choose the date
      </Button>,
    );

    expect(caret).toMatch(/<svg/);
    expect(caret).not.toBe(arrow);
  });

  it("leads its label with an icon, hidden from screen readers", () => {
    const markup = render(<Button icon={PlusIcon}>Record a change</Button>);

    expect(markup).toMatch(
      /<svg[^>]*aria-hidden="true"[^>]*>.*<\/svg>Record a change/,
    );
    expect(render(<Button>Record a change</Button>)).not.toMatch(/<svg/);
  });

  it("takes className as a string or as a function of its state", () => {
    expect(render(<Button className="w-full">Sell</Button>)).toMatch(
      /<button[^>]*class="[^"]*w-full/,
    );

    const byState = (state: { disabled: boolean }) =>
      state.disabled ? "is-off" : "is-on";

    expect(render(<Button className={byState}>Sell</Button>)).toMatch(
      /<button[^>]*class="[^"]*is-on/,
    );
    expect(
      render(
        <Button disabled className={byState}>
          Sell
        </Button>,
      ),
    ).toMatch(/<button[^>]*class="[^"]*is-off/);
  });
});
