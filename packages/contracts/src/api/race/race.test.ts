import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../../anonymize.js";
import { createOpenApiDocument } from "../../openapi.js";
import { memberSeriesPointSchema } from "../../schemas/performance.js";
import { getRace, type Race, raceSchema } from "./race.js";

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

const row = raceSchema.shape.members.element.shape;

describe("GET /race", () => {
  it("is declared for every role, with the session and input codes", () => {
    const { route, meta, errorMap } = getRace["~orpc"];
    expect(route).toMatchObject({ method: "GET", path: "/race" });
    expect(meta.roles).toEqual(["admin", "member", "guest", "anonymous"]);
    expect(Object.keys(errorMap).sort()).toEqual(
      [
        "access_ended",
        "internal_error",
        "invalid_request",
        "unauthenticated",
      ].sort(),
    );
  });

  it("takes the period as a query string, and no unit", () => {
    const input = getRace["~orpc"].inputSchema;
    expect(input?.parse({ period: "1D", unit: "percent" })).toEqual({
      period: "1D",
    });
    expect(input?.safeParse({}).success).toBe(false);
  });

  it("accepts closes then provisional points in euros and percent, before any price too", () => {
    expect(raceSchema.parse(race)).toEqual(race);
    expect(raceSchema.shape).not.toHaveProperty("unit");
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

  it("uses the shared series point, and the markers", () => {
    expect(row.points.element).toBe(memberSeriesPointSchema);
    expect(row.measuredFrom.safeParse("2026-03-02").success).toBe(true);
    expect(row.incomplete.safeParse(true).success).toBe(true);
    expect(raceSchema.shape.notStarted.safeParse(race.notStarted).success).toBe(
      true,
    );
  });

  it("marks names and pictures personal, euro amounts euro, and keeps percentages", () => {
    const { shape } = memberSeriesPointSchema;
    expect(anonymizeKind(row.member.shape.displayName)).toBe("personal");
    expect(anonymizeKind(row.member.shape.avatarUrl)).toBe("personal");
    expect(anonymizeKind(shape.balanceEur)).toBe("euro");
    expect(anonymizeKind(shape.gain.shape.eur)).toBe("euro");
    expect(anonymizeKind(shape.gain.shape.percent)).toBeUndefined();
  });

  it("is in the OpenAPI document, with its roles, markers and error codes", async () => {
    const operation = (await createOpenApiDocument()).paths?.["/race"]?.get;
    expect(operation).toMatchObject({
      operationId: "race.race",
      "x-roles": ["admin", "member", "guest", "anonymous"],
    });
    expect(Object.keys(operation?.responses ?? {}).sort()).toEqual([
      "200",
      "400",
      "401",
      "500",
    ]);
    const json = JSON.stringify(operation?.responses?.["200"]);
    expect(json).toContain('"x-anonymize":"euro"');
  });
});
