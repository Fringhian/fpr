import type { PersonKey } from "./people.ts";
import type { ShareKey } from "./shares.ts";

/**
 * A day's entries for one person: share changes, positive to buy and
 * negative to sell, then the cash they hold from then on.
 */
export type FixtureDay = {
  daysAgo: number;
  changes?: Partial<Record<ShareKey, string>>;
  cashEur?: string;
};

/** Every portfolio's history, oldest first. Invented, like the people. */
export const fixturePortfolios: Partial<Record<PersonKey, FixtureDay[]>> = {
  alex: [
    { daysAgo: 420, changes: { world: "60", tech: "10" }, cashEur: "1500" },
    { daysAgo: 380, changes: { vineyard: "20" } },
    { daysAgo: 300, changes: { dividend: "100" }, cashEur: "400" },
    { daysAgo: 200, changes: { tech: "-3" }, cashEur: "1900" },
    { daysAgo: 120, changes: { emerging: "80" }, cashEur: "700" },
    { daysAgo: 20, changes: { world: "10" }, cashEur: "300" },
  ],
  sam: [
    { daysAgo: 410, changes: { world: "40", energy: "150" }, cashEur: "800" },
    { daysAgo: 350, changes: { tech: "6" } },
    { daysAgo: 250, changes: { energy: "-50" }, cashEur: "1300" },
    { daysAgo: 90, changes: { health: "30" }, cashEur: "400" },
    { daysAgo: 6, changes: { tech: "2.5" }, cashEur: "50" },
  ],
  robin: [
    {
      daysAgo: 395,
      changes: { vineyard: "30", wind: "40", dividend: "200" },
      cashEur: "2000",
    },
    { daysAgo: 260, changes: { health: "25" } },
    { daysAgo: 180, changes: { emerging: "120" }, cashEur: "600" },
    { daysAgo: 60, changes: { smallcaps: "150" }, cashEur: "100" },
  ],
  jordan: [
    { daysAgo: 375, changes: { tech: "15" }, cashEur: "500" },
    { daysAgo: 300, changes: { energy: "300" } },
    { daysAgo: 150, changes: { world: "25" }, cashEur: "200" },
    { daysAgo: 40, changes: { tech: "-5" }, cashEur: "1400" },
    { daysAgo: 4, changes: { emerging: "30" }, cashEur: "575" },
  ],
  charlie: [
    {
      daysAgo: 70,
      changes: { world: "45", dividend: "60" },
      cashEur: "1000",
    },
    { daysAgo: 25, changes: { health: "12" }, cashEur: "250" },
  ],
  lou: [
    {
      daysAgo: 10,
      changes: { robotics: "20", world: "15" },
      cashEur: "300",
    },
  ],
  camille: [
    {
      daysAgo: 1,
      changes: { world: "12", vineyard: "4.5", robotics: "30" },
      cashEur: "750",
    },
  ],
  eden: [{ daysAgo: 340, changes: { world: "20" }, cashEur: "100" }],
};
