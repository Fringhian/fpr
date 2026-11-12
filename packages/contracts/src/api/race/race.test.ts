import { describe, expect, it } from "vitest";
import { type Race, raceSchema } from "./race.js";

function point(
  at: string,
  balanceEur: string,
  eur: string,
  percent: string,
  provisional = false,
) {
  return {
    at,
    balanceEur,
    gain: { eur, percent },
    provisional,
    incomplete: false,
  };
}

const race: Race = {
  lastCloseOn: "2026-03-02",
  latestPricesAt: "2026-03-03T14:30:00+01:00",
  refreshesRunning: true,
  members: [
    {
      member: {
        id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70",
        displayName: "Alex Martin",
        avatarUrl: null,
        color: 3,
      },
      measuredFrom: null,
      incomplete: false,
      points: [
        point("2026-02-27T23:59:59+01:00", "12220.00", "0", "0"),
        point("2026-03-02T23:59:59+01:00", "12372.75", "152.75", "1.25"),
        point("2026-03-03T09:30:00+01:00", "12354.40", "134.40", "1.10", true),
        point("2026-03-03T14:30:00+01:00", "12393.50", "173.50", "1.42", true),
      ],
    },
    {
      member: {
        id: "1c7a4d2f-9b3e-4d8f-a021-3c4d5e6f7a81",
        displayName: "Sam Rivera",
        avatarUrl: null,
        color: 5,
      },
      measuredFrom: "2026-03-02",
      incomplete: true,
      points: [
        point("2026-03-02T23:59:59+01:00", "5000.00", "0", "0"),
        point("2026-03-03T14:30:00+01:00", "4960.00", "-40.00", "-0.80", true),
      ],
    },
  ],
  notStarted: [
    {
      id: "3e9c6f4b-bd50-4fa1-8243-5e6f7a8b9ca3",
      displayName: "Kim Laurent",
      avatarUrl: null,
      color: 7,
    },
  ],
};

describe("GET /race", () => {
  it("accepts closes then provisional points in euros and percent, before any price too", () => {
    expect(raceSchema.parse(race)).toEqual(race);
    const empty = {
      ...race,
      latestPricesAt: null,
      refreshesRunning: false,
      members: [],
    };
    expect(raceSchema.parse(empty)).toEqual(empty);
  });

  it("refuses a point without its time, a day alone, and a gain as a number", () => {
    const [alex] = race.members;
    const withPoint = (changed: object) => ({
      ...race,
      members: [{ ...alex, points: [{ ...alex?.points[0], ...changed }] }],
    });
    expect(raceSchema.safeParse(withPoint({ at: undefined })).success).toBe(
      false,
    );
    expect(raceSchema.safeParse(withPoint({ at: "2026-03-02" })).success).toBe(
      false,
    );
    expect(
      raceSchema.safeParse(withPoint({ gain: { eur: 1, percent: 1 } })).success,
    ).toBe(false);
  });
});
