import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../../anonymize.js";
import { createOpenApiDocument } from "../../openapi.js";
import { getRace, type Race, raceSchema } from "./race.js";

const race: Race = {
  unit: "percent",
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
      closes: [
        { on: "2026-02-27", gain: "0" },
        { on: "2026-03-02", gain: "1.25" },
      ],
      provisional: [
        { at: "2026-03-03T09:30:00+01:00", gain: "1.10" },
        { at: "2026-03-03T14:30:00+01:00", gain: "1.42" },
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
      closes: [{ on: "2026-03-02", gain: "0" }],
      provisional: [{ at: "2026-03-03T14:30:00+01:00", gain: "-0.80" }],
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

const [eurOption, percentOption] = raceSchema.options;

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

  it("takes the period and unit as query strings", () => {
    const input = getRace["~orpc"].inputSchema;
    expect(input?.safeParse({ period: "1D", unit: "percent" }).success).toBe(
      true,
    );
    expect(input?.safeParse({ unit: "percent" }).success).toBe(false);
    expect(input?.safeParse({ period: "1D", unit: "EUR" }).success).toBe(false);
  });

  it("accepts closes then provisional points, in percent or euros, before any price too", () => {
    expect(raceSchema.parse(race)).toEqual(race);
    const inEuros = { ...race, unit: "eur" };
    expect(raceSchema.parse(inEuros)).toEqual(inEuros);
    const empty = {
      ...race,
      latestPricesAt: null,
      refreshesRunning: false,
      members: [],
    };
    expect(raceSchema.parse(empty)).toEqual(empty);
  });

  it("refuses a provisional point without its time, a close with one, and a gain as a number", () => {
    const [alex] = race.members;
    const withRows = (row: object) => ({ ...race, members: [row] });
    expect(
      raceSchema.safeParse(
        withRows({ ...alex, provisional: [{ on: "2026-03-03", gain: "1" }] }),
      ).success,
    ).toBe(false);
    expect(
      raceSchema.safeParse(
        withRows({
          ...alex,
          closes: [{ on: "2026-03-02T17:30:00+01:00", gain: "1" }],
        }),
      ).success,
    ).toBe(false);
    expect(
      raceSchema.safeParse(
        withRows({ ...alex, closes: [{ on: "2026-03-02", gain: 1.25 }] }),
      ).success,
    ).toBe(false);
  });

  it("carries the measured-from, incomplete and not-started markers", () => {
    const row = percentOption.shape.members.element.shape;
    expect(row.measuredFrom.safeParse("2026-03-02").success).toBe(true);
    expect(row.incomplete.safeParse(true).success).toBe(true);
    expect(
      percentOption.shape.notStarted.safeParse(race.notStarted).success,
    ).toBe(true);
  });

  it("marks names and pictures personal, euro gains euro, and keeps percentages", () => {
    const eurRow = eurOption.shape.members.element.shape;
    const percentRow = percentOption.shape.members.element.shape;
    expect(anonymizeKind(eurRow.member.shape.displayName)).toBe("personal");
    expect(anonymizeKind(eurRow.member.shape.avatarUrl)).toBe("personal");
    expect(anonymizeKind(eurRow.closes.element.shape.gain)).toBe("euro");
    expect(anonymizeKind(eurRow.provisional.element.shape.gain)).toBe("euro");
    expect(anonymizeKind(percentRow.closes.element.shape.gain)).toBeUndefined();
    expect(
      anonymizeKind(percentRow.provisional.element.shape.gain),
    ).toBeUndefined();
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
    expect(json.match(/"x-anonymize":"euro"/g)).toHaveLength(2);
  });
});
