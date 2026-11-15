import type { ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../lib/i18n";
import type { Language } from "../../lib/language";
import { NARROW_NBSP } from "../../lib/typography";
import { Greeting, Race, type RaceProps, Wide } from "./sentence";

/** The visible text of a markup: tags dropped. */
function text(markup: string): string {
  return markup.replace(/<[^>]*>/g, "");
}

function render(node: ReactNode, language: Language = "en"): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={createI18n(language)}>{node}</I18nextProvider>,
  );
}

const viewer = {
  name: "Alex",
  color: "cobalt",
  timeOfDay: "evening",
  period: "1M",
  unit: "percent",
} as const;

const sam = {
  name: "Sam",
  color: "vermilion",
  gain: { eur: "640", percent: "6.1" },
} as const;

const star = { name: "Swiss Pharma AG", gain: "12.4" };

function race(props: RaceProps, language?: Language): string {
  return render(<Race {...props} />, language);
}

describe("Race", () => {
  it("greets, gives your result, and names who leads and the star share", () => {
    const markup = race({
      ...viewer,
      standing: "theyLead",
      gain: { eur: "512", percent: "4.2" },
      leader: sam,
      starShare: star,
    });
    expect(text(markup)).toBe(
      "Good evening, AlexThis month, you’re up €512 (+4.2%)SSam leads at +6.1% · star share Swiss Pharma AG+12.4%",
    );
    expect(markup).toContain('<span class="text-positive">€512 (+4.2%)</span>');
  });

  it("keeps the star share for tablet and desktop", () => {
    const markup = race({
      ...viewer,
      standing: "theyLead",
      gain: { eur: "512", percent: "4.2" },
      leader: sam,
      starShare: star,
    });
    expect(markup).toMatch(
      /<span class="hidden tablet:inline desktop:inline"> · star share/,
    );
  });

  it("says when you lead", () => {
    const markup = race({
      ...viewer,
      standing: "youLead",
      gain: { eur: "512", percent: "4.2" },
    });
    expect(text(markup)).toBe(
      "Good evening, AlexThis month, you’re up €512 (+4.2%)AYou lead the race",
    );
  });

  it("says everyone is down when the leader is down", () => {
    const markup = race({
      ...viewer,
      standing: "theyLead",
      gain: { eur: "-120", percent: "-1.3" },
      leader: { ...sam, gain: { eur: "-40", percent: "-0.4" } },
    });
    expect(text(markup)).toBe(
      "Good evening, AlexThis month, you’re down €120 (−1.3%)Everyone is down this month · SSam leads at −0.4%",
    );
    expect(markup).toContain('<span class="text-negative">€120 (−1.3%)</span>');
    expect(markup).toContain(
      '<span class="hidden tablet:inline desktop:inline">Everyone is down this month · </span>',
    );
  });

  it("says everyone is down when you lead down", () => {
    const markup = race({
      ...viewer,
      standing: "youLead",
      gain: { eur: "-40", percent: "-0.4" },
    });
    expect(text(markup)).toContain(
      "Everyone is down this month · AYou lead the race",
    );
  });

  it("says you’re the first one in when you’re alone", () => {
    const markup = race({
      ...viewer,
      standing: "alone",
      gain: { eur: "-40", percent: "-0.4" },
    });
    expect(text(markup)).toBe(
      "Good evening, AlexThis month, you’re down €40 (−0.4%)You’re the first one in",
    );
  });

  it("names the leader in the headline for a viewer without a portfolio", () => {
    const markup = race({
      ...viewer,
      name: "Brave Otter",
      standing: "watching",
      leader: { ...sam, name: "Quiet Heron", gain: { percent: "6.1" } },
      starShare: star,
    });
    expect(text(markup)).toBe(
      "Good evening, Brave OtterThis month, Quiet Heron leads at +6.1%Star share Swiss Pharma AG+12.4%",
    );
  });

  it("says you’re flat when your gain rounds to zero", () => {
    const markup = race({
      ...viewer,
      standing: "alone",
      gain: { eur: "0", percent: "0.01" },
    });
    expect(text(markup)).toContain("you’re flat at €0 (0.0%)");
  });

  it("passes every other prop to its block, its classes included", () => {
    const markup = race({
      ...viewer,
      standing: "alone",
      gain: { eur: "512", percent: "4.2" },
      id: "sentence",
      className: "pt-s",
    });
    expect(markup).toMatch(/^<div id="sentence" class="pt-s">/);
  });

  it("writes the sentence in French", () => {
    const markup = race(
      {
        ...viewer,
        standing: "theyLead",
        gain: { eur: "512", percent: "4.2" },
        leader: sam,
        starShare: star,
      },
      "fr",
    );
    const n = NARROW_NBSP;
    expect(text(markup)).toBe(
      `Bonsoir, AlexCe mois-ci, vous gagnez 512${n}€ (+4,2${n}%)SSam est en tête avec +6,1${n}% · titre vedette Swiss Pharma AG+12,4${n}%`,
    );
  });
});

describe("Parts", () => {
  it("pass every prop to their element, a conflicting class winning", () => {
    const greeting = render(
      <Greeting id="greeting" className="text-l">
        Hello
      </Greeting>,
    );
    expect(greeting).toBe(
      '<p id="greeting" class="text-on-sky text-l">Hello</p>',
    );
    const wide = render(<Wide className="desktop:hidden">More</Wide>);
    expect(wide).toBe(
      '<span class="hidden tablet:inline desktop:hidden">More</span>',
    );
  });
});
