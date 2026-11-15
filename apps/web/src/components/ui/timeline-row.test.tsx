import { StarIcon } from "@phosphor-icons/react/Star";
import type { ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../lib/i18n";
import type { Language } from "../../lib/language";
import { NARROW_NBSP } from "../../lib/typography";
import * as Menu from "./menu";
import { TimelineList, TimelineRow } from "./timeline-row";

function render(element: ReactElement, language: Language = "en"): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={createI18n(language)}>{element}</I18nextProvider>,
  );
}

/** The markup's text, tags removed. */
function text(markup: string): string {
  return markup.replace(/<[^>]+>/g, "");
}

describe("TimelineRow", () => {
  it("is a list item with the day as a time element", () => {
    const markup = render(
      <TimelineRow
        kind="bought"
        date="2026-03-03"
        share="World Index ETF"
        quantity="10"
        before="50"
        after="60"
      />,
    );
    expect(markup).toMatch(/^<li /);
    expect(markup).toMatch(/<time datetime="2026-03-03"/i);
    expect(text(markup)).toContain("3 Mar");
  });

  it("writes a purchase with the holding before and after", () => {
    const markup = render(
      <TimelineRow
        kind="bought"
        date="2026-03-03"
        share="World Index ETF"
        quantity="10"
        before="50"
        after="60"
      />,
    );
    expect(text(markup)).toContain("Bought 10 World Index ETF");
    expect(text(markup)).toContain("50 → 60");
    expect(text(markup)).toContain("from 50 to 60 units held");
  });

  it("calls a purchase from zero a new holding, keeping the quantity's decimals", () => {
    const markup = render(
      <TimelineRow
        kind="bought"
        date="2026-02-02"
        share="Global Tech Fund"
        quantity="74.328"
        before="0"
        after="74.328"
      />,
    );
    expect(text(markup)).toContain("Bought 74.328 Global Tech Fund");
    expect(text(markup)).toContain("New holding");
    expect(text(markup)).not.toContain("→");
  });

  it("writes a sale down to zero as before → after", () => {
    const markup = render(
      <TimelineRow
        kind="sold"
        date="2026-02-24"
        share="US Health ETF"
        quantity="12"
        before="12"
        after="0"
      />,
    );
    expect(text(markup)).toContain("Sold 12 US Health ETF");
    expect(text(markup)).toContain("12 → 0");
  });

  it("writes a cash balance with the one it replaced, or as the first", () => {
    const set = render(
      <TimelineRow
        kind="cashSet"
        date="2026-03-01"
        amount="2000"
        before="2400"
      />,
    );
    expect(text(set)).toContain("Cash set to €2,000.00");
    expect(text(set)).toContain("was €2,400.00");

    const first = render(
      <TimelineRow
        kind="cashSet"
        date="2026-01-12"
        amount="2400"
        before={null}
      />,
    );
    expect(text(first)).toContain("First cash entry");
  });

  it("writes a value added and a value edited", () => {
    const added = render(
      <TimelineRow kind="valueAdded" date="2026-01-02" price="38.60" />,
    );
    expect(text(added)).toContain("Value of €38.60 added");

    const edited = render(
      <TimelineRow
        kind="valueEdited"
        date="2026-03-03"
        price="40.10"
        before="41.00"
      />,
    );
    expect(text(edited)).toContain("Value changed to €40.10");
    expect(text(edited)).toContain("was €41.00");
  });

  it("names who made it after the change", () => {
    const markup = render(
      <TimelineRow
        kind="sold"
        date="2026-02-24"
        share="US Health ETF"
        quantity="5"
        before="12"
        after="7"
        madeBy="Alex"
      />,
    );
    expect(text(markup)).toContain("12 → 7");
    expect(text(markup)).toContain(" · by Alex");
  });

  it("has no detail line for a value added by nobody named", () => {
    const markup = render(
      <TimelineRow kind="valueAdded" date="2026-01-02" price="38.60" />,
    );
    expect(text(markup)).toBe("2 JanValue of €38.60 added");
  });

  it("writes in French, numbers and dates included", () => {
    const markup = render(
      <TimelineRow
        kind="cashSet"
        date="2026-03-01"
        amount="2000"
        before="2400"
        madeBy="Alex"
      />,
      "fr",
    );
    expect(text(markup)).toContain("1 mars");
    expect(text(markup)).toContain(
      `Liquidités fixées à 2${NARROW_NBSP}000,00${NARROW_NBSP}€`,
    );
    expect(text(markup)).toContain("par Alex");
  });

  it("draws the ⋯ menu only with actions, named after the row", () => {
    const without = render(
      <TimelineRow kind="valueAdded" date="2026-01-02" price="38.60" />,
    );
    expect(without).not.toContain("<button");

    const withActions = render(
      <TimelineRow
        kind="valueAdded"
        date="2026-01-02"
        price="38.60"
        actions={<Menu.Item>Edit</Menu.Item>}
      />,
    );
    expect(withActions).toContain(
      'aria-label="More actions for Value of €38.60 added, 2 Jan"',
    );
  });

  it("takes another icon than the kind's", () => {
    const own = render(
      <TimelineRow
        kind="valueAdded"
        date="2026-01-02"
        price="38.60"
        icon={StarIcon}
      />,
    );
    const kinds = render(
      <TimelineRow kind="valueAdded" date="2026-01-02" price="38.60" />,
    );
    expect(own).not.toEqual(kinds);
  });

  it("draws any icon on its ⋯ button", () => {
    const actions = <Menu.Item>Edit</Menu.Item>;
    const dots = render(
      <TimelineRow
        kind="valueAdded"
        date="2026-01-02"
        price="38.60"
        actions={actions}
      />,
    );
    const star = render(
      <TimelineRow
        kind="valueAdded"
        date="2026-01-02"
        price="38.60"
        actions={actions}
        actionsIcon={StarIcon}
      />,
    );
    expect(star).not.toEqual(dots);
  });

  it("refuses a kind's fields on another kind, and a kind without its own", () => {
    // Type checks only: never rendered.
    const cashWithShare = () => (
      // @ts-expect-error: a cash balance has no share.
      <TimelineRow
        kind="cashSet"
        date="2026-03-01"
        amount="2000"
        before={null}
        share="World Index ETF"
      />
    );
    const purchaseWithoutAfter = () => (
      // @ts-expect-error: a purchase needs the holding after it.
      <TimelineRow
        kind="bought"
        date="2026-03-03"
        share="World Index ETF"
        quantity="10"
        before="50"
      />
    );
    expect([cashWithShare, purchaseWithoutAfter]).toHaveLength(2);
  });
});

describe("TimelineList", () => {
  it("is an ordered list", () => {
    const markup = render(
      <TimelineList aria-label="History">
        <TimelineRow kind="valueAdded" date="2026-01-02" price="38.60" />
      </TimelineList>,
    );
    expect(markup).toMatch(/^<ol [^>]*aria-label="History"[^>]*><li /);
  });
});
