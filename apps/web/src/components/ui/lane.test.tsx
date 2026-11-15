import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../lib/i18n";
import type { Language } from "../../lib/language";
import { Lane, LaneNotStarted, type LaneProps } from "./lane";

const SAM = {
  name: "Sam",
  color: "vermilion",
  best: { share: "Swiss Pharma AG", percent: "12.4" },
  value: { board: "gain", gain: { eur: "610", percent: "6.1" }, unit: "eur" },
  scale: { min: -305, max: 610 },
} as const satisfies LaneProps;

function render(props: Partial<LaneProps>, language: Language = "en"): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={createI18n(language)}>
      <Lane {...SAM} {...props} />
    </I18nextProvider>,
  );
}

describe("Lane", () => {
  it("is a button that names the member, their best share and their value", () => {
    const html = render({});
    expect(html).toMatch(/<button[^>]*aria-expanded="false"/);
    expect(html).toContain(">Sam<");
    expect(html).toContain("Best: Swiss Pharma AG");
    expect(html).toContain("+€610");
  });

  it("draws the bar from the zero line, rightwards for a gain", () => {
    const html = render({});
    expect(html).toContain("left:33.33333333333333%");
    expect(html).toContain("width:66.66666666666667%");
    expect(html).toContain("bg-vermilion");
  });

  it("draws a loss leftwards from the zero line", () => {
    const html = render({
      value: {
        board: "gain",
        gain: { eur: "-305", percent: "-2.5" },
        unit: "eur",
      },
    });
    expect(html).toContain("left:0%;width:33.33333333333333%");
    expect(html).toContain("text-negative");
  });

  it("tints the viewer's own lane", () => {
    expect(render({ you: true })).toContain("bg-highlight");
    expect(render({ you: true })).toContain("· you");
    expect(render({})).not.toContain("bg-highlight");
  });

  it("shows no rank number", () => {
    const text = render({ medal: "gold" }).replace(/<[^>]+>/g, " ");
    expect(text).not.toMatch(/(^|\s)[1-9](\s|$)/);
  });

  it("marks an incomplete balance and a short history", () => {
    const html = render({ incomplete: true, measuredFrom: "2026-02-12" });
    expect(html).toContain(">Incomplete<");
    expect(html).toContain("since 12 Feb");
    expect(render({ incomplete: true }, "fr")).toContain(">Incomplet<");
  });

  it("reads in percent for an anonymous viewer", () => {
    const html = render({
      name: "Calm Heron",
      value: { board: "gain", gain: { percent: "6.1" }, unit: "eur" },
      scale: { min: 0, max: 6.1 },
    });
    expect(html).toContain("+6.1%");
    expect(html).not.toContain("€");
  });

  it("writes a balance in whole euros, and nothing without one", () => {
    expect(
      render({ value: { board: "balance", balance: "12374.56" } }),
    ).toContain("€12,375");
    expect(
      render({ value: { board: "balance", balance: null } }),
    ).not.toContain("€");
  });

  it("passes every other prop to the collapsible root, its classes included", () => {
    const html = render({ id: "lane-sam", className: "rounded-l" });
    expect(html).toMatch(/^<div[^>]* id="lane-sam" class="rounded-l"/);
  });

  it("takes classes from a function of the collapsible's state", () => {
    const html = render({
      defaultOpen: true,
      className: (state) => (state.open ? "shadow-rest" : ""),
    });
    expect(html).toMatch(/^<div[^>]*class="rounded-m shadow-rest"/);
  });

  it("opens to show the best share with its gain", () => {
    const html = render({ open: true });
    expect(html).toMatch(/<button[^>]*aria-expanded="true"/);
    expect(html).toContain("Best share");
    expect(html).toContain("+12.4%");
  });
});

describe("LaneNotStarted", () => {
  function notStarted(names: string[], language: Language = "en"): string {
    return renderToStaticMarkup(
      <I18nextProvider i18n={createI18n(language)}>
        <LaneNotStarted names={names} />
      </I18nextProvider>,
    );
  }

  it("names who hasn't started, in one line", () => {
    expect(notStarted(["Kim"])).toContain("Kim hasn’t started yet.");
    expect(notStarted(["Kim", "Nora"])).toContain(
      "Kim and Nora haven’t started yet.",
    );
    expect(notStarted(["Kim", "Nora"], "fr")).toContain(
      "Kim et Nora n’ont pas encore commencé.",
    );
  });

  it("renders nothing when everyone has started", () => {
    expect(notStarted([])).toBe("");
  });

  it("passes every other prop to its paragraph, its classes included", () => {
    const html = renderToStaticMarkup(
      <I18nextProvider i18n={createI18n("en")}>
        <LaneNotStarted names={["Kim"]} id="not-started" className="pt-m" />
      </I18nextProvider>,
    );
    expect(html).toMatch(/^<p id="not-started" class="[^"]*pt-m/);
    expect(html).not.toContain("pt-s");
  });
});
