import { renderToStaticMarkup } from "react-dom/server";
import { I18nextProvider } from "react-i18next";
import { describe, expect, it } from "vitest";
import { createI18n } from "../../lib/i18n";
import type { Language } from "../../lib/language";
import {
  Standings,
  type StandingsMember,
  type StandingsProps,
} from "./standings";

const MEMBERS = [
  {
    id: "sam",
    name: "Sam",
    color: "vermilion",
    value: { board: "gain", gain: { eur: "600", percent: "6" }, unit: "eur" },
  },
  {
    id: "alex",
    name: "Alex",
    color: "cobalt",
    value: { board: "gain", gain: { eur: "300", percent: "3" }, unit: "eur" },
  },
  {
    id: "lea",
    name: "Lea",
    color: "green",
    value: { board: "gain", gain: { eur: "100", percent: "1" }, unit: "eur" },
  },
  {
    id: "theo",
    name: "Theo",
    color: "cyan",
    value: { board: "gain", gain: { eur: "-300", percent: "-3" }, unit: "eur" },
  },
] as const satisfies readonly StandingsMember[];

function render(
  props: Partial<StandingsProps>,
  language: Language = "en",
): string {
  return renderToStaticMarkup(
    <I18nextProvider i18n={createI18n(language)}>
      <Standings board="gain" members={MEMBERS} {...props} />
    </I18nextProvider>,
  );
}

describe("Standings", () => {
  it("lists the lanes in order, with no rank numbers", () => {
    const html = render({});
    expect(html).toMatch(/<ol[^>]*>(<li>.*?<\/li>){4}<\/ol>/);
    expect(html.indexOf(">Sam<")).toBeLessThan(html.indexOf(">Theo<"));
  });

  it("rings the first three lanes only", () => {
    const html = render({});
    expect(
      html.match(/outline-gold|outline-silver|outline-bronze/g),
    ).toHaveLength(3);
  });

  it("draws every lane on one scale", () => {
    const html = render({});
    // From −300 to 600, the zero line sits a third of the way in every lane.
    expect(html.match(/left:33\.33333333333333%"/g)).toHaveLength(4);
  });

  it("tints the viewer's lane", () => {
    expect(render({ viewerId: "alex" })).toContain("· you");
    expect(render({})).not.toContain("· you");
  });

  it("opens the focused member's lane", () => {
    const html = render({ focusedId: "lea" });
    expect(html.match(/aria-expanded="true"/g)).toHaveLength(1);
  });

  it("titles the card with the period", () => {
    expect(render({ period: "this month" })).toContain(
      "Standings · this month",
    );
    expect(render({}, "fr")).toContain(">Classement<");
  });

  it("offers Gain and Balance, but Gain only to an anonymous viewer", () => {
    expect(render({})).toContain("Balance");
    expect(render({ anonymous: true })).not.toContain("Balance");
  });

  it("lists who hasn't started under the lanes", () => {
    const html = render({ notStarted: ["Kim", "Nora"] });
    expect(html).toContain("Kim and Nora haven’t started yet.");
    expect(html.indexOf("</ol>")).toBeLessThan(html.indexOf("Kim and Nora"));
  });

  it("says nobody is in the race when there are no lanes", () => {
    const html = render({ members: [], notStarted: ["Kim"] });
    expect(html).not.toContain("<ol");
    expect(html).not.toContain("Balance");
    expect(html).toContain("Nobody’s in the race yet");
    expect(html).toContain("Kim hasn’t started yet.");
  });
});
