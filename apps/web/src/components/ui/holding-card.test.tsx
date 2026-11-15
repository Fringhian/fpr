import { ArrowRightIcon } from "@phosphor-icons/react/ArrowRight";
import { ListIcon } from "@phosphor-icons/react/List";
import type { ComponentProps, ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../lib/i18n";
import type { Language } from "../../lib/language";
import { MINUS, NARROW_NBSP } from "../../lib/typography";
import { CashCard, HoldingCard, type HoldingCardProps } from "./holding-card";

function render(element: ReactElement, language: Language = "en"): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={createI18n(language)}>{element}</I18nextProvider>,
  );
}

/** The share page's link, as the router's `<Link>` would be: the card gives it its content. */
function ShareLink(props: ComponentProps<"a">) {
  return <a {...props} href="#share" />;
}

/** An invented holding, priced by today's refresh. No curve: the chart draws in a browser only. */
const HOLDING = {
  name: "World Index ETF",
  quantity: "74.328",
  latestPrice: {
    at: "2026-03-05T14:30:00Z",
    priceEur: "98.40",
    source: "intraday",
  },
  curve: [],
  valueEur: "7313.88",
  weight: "49.5",
  gain: { eur: "421.80", percent: "7.7" },
  unit: "eur",
  timeZone: "UTC",
} as const satisfies HoldingCardProps;

describe("HoldingCard", () => {
  it("shows the quantity as entered, the price with its time, the value and the gain", () => {
    const html = render(<HoldingCard {...HOLDING} />);
    expect(html).toContain("74.328 units · €98.40 · as of 14:30");
    expect(html).toContain("€7,314");
    expect(html).toContain("+€421.80");
  });

  it("reads one unit in the singular, and French numbers in French", () => {
    expect(render(<HoldingCard {...HOLDING} quantity="1" />)).toContain(
      "1 unit ·",
    );
    expect(render(<HoldingCard {...HOLDING} />, "fr")).toContain(
      `74,328 parts · 98,40${NARROW_NBSP}€ · à 14:30`,
    );
  });

  it("dates a close and a manual value", () => {
    const close = { ...HOLDING.latestPrice, source: "close" } as const;
    const manual = { ...HOLDING.latestPrice, source: "manual" } as const;
    expect(render(<HoldingCard {...HOLDING} latestPrice={close} />)).toContain(
      "close of 5 Mar",
    );
    const html = render(
      <HoldingCard {...HOLDING} kind="manual" latestPrice={manual} />,
    );
    expect(html).toContain("as of 5 Mar");
    expect(html).toContain(">Manual<");
  });

  it("shows a share with no price yet as pending, not counted", () => {
    const html = render(
      <HoldingCard
        {...HOLDING}
        latestPrice={null}
        valueEur={null}
        weight={null}
        gain={null}
      />,
    );
    expect(html).toContain("74.328 units<");
    expect(html).toContain("Loading its prices…");
    expect(html).toContain(">Price pending<");
    expect(html).toContain("not counted yet");
    expect(html).not.toContain("€");
  });

  it("shows an anonymous viewer the weight, never the quantity or an amount", () => {
    const html = render(<HoldingCard {...HOLDING} anonymous />);
    expect(html).toContain("49.5%");
    expect(html).toContain("+7.7%");
    expect(html).not.toContain("units");
    expect(html).not.toContain("7,314");
    expect(html).not.toContain("421");
  });

  it("names its ⋯ button by the share, only with actions", () => {
    expect(render(<HoldingCard {...HOLDING} />)).not.toContain("More actions");
    expect(
      render(<HoldingCard {...HOLDING} actions={<span>Sell</span>} />),
    ).toContain('aria-label="More actions for World Index ETF"');
  });

  it("draws any icon for its ⋯ button and its link", () => {
    const actions = <span>Sell</span>;
    const link = <ShareLink />;
    const dots = render(<HoldingCard {...HOLDING} actions={actions} />);
    const list = render(
      <HoldingCard {...HOLDING} actions={actions} actionsIcon={ListIcon} />,
    );
    const caret = render(<HoldingCard {...HOLDING} link={link} />);
    const arrow = render(
      <HoldingCard {...HOLDING} link={link} linkIcon={ArrowRightIcon} />,
    );

    expect(list).toMatch(/<svg/);
    expect(list).not.toBe(dots);
    expect(arrow).not.toBe(caret);
  });

  it("passes every other prop to the article", () => {
    const html = render(
      <HoldingCard {...HOLDING} id="holding" className="col-span-2" />,
    );

    expect(html).toMatch(/^<article id="holding"/);
    expect(html).toContain("col-span-2");
  });

  it("colours a loss with its minus sign", () => {
    const html = render(
      <HoldingCard
        {...HOLDING}
        gain={{ eur: "-50.75", percent: "-4.6" }}
        unit="percent"
      />,
    );
    expect(html).toContain(`${MINUS}4.6%`);
    expect(html).toContain("text-negative");
  });
});

describe("CashCard", () => {
  it("shows the cash, the day it was set, and Update cash with a callback", () => {
    const html = render(
      <CashCard
        amountEur="2000.00"
        weight="16.7"
        setOn="2026-03-01"
        onUpdateCash={() => {}}
      />,
    );
    expect(html).toContain("Set on 1 Mar");
    expect(html).toContain("€2,000");
    expect(html).toContain("Update cash");
  });

  it("draws any icon after Update cash", () => {
    const caret = render(<CashCard weight="16.7" onUpdateCash={() => {}} />);
    const arrow = render(
      <CashCard
        weight="16.7"
        onUpdateCash={() => {}}
        updateCashIcon={ArrowRightIcon}
      />,
    );

    expect(arrow).toMatch(/Update cash<svg/);
    expect(arrow).not.toBe(caret);
  });

  it("shows an anonymous viewer the weight, with no action", () => {
    const html = render(
      <CashCard amountEur="2000.00" weight="16.7" anonymous />,
    );
    expect(html).toContain("16.7%");
    expect(html).not.toContain("2,000");
    expect(html).not.toContain("Update cash");
  });
});
