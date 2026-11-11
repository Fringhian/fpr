import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../../anonymize.js";
import { createOpenApiDocument } from "../../openapi.js";
import { getMembers, type Members, membersSchema } from "./members.js";

const exampleFund = {
  id: "2d8b5e3a-ac4f-4e90-b132-4d5e6f7a8b92",
  isin: "IE00B4L5Y983",
  name: "Example World Fund",
  kind: "market",
  symbol: "EXW.XETRA",
} as const;

const exampleBank = {
  id: "5abe8b6d-df72-41c3-a465-7a8b9cadbec5",
  isin: "FR0000000019",
  name: "Example Bank SA",
  kind: "market",
  symbol: "EXB.PA",
} as const;

const members: Members = {
  unit: "eur",
  members: [
    {
      member: {
        id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70",
        displayName: "Alex Martin",
        avatarUrl: null,
        color: 3,
      },
      firstEntryOn: "2026-02-12",
      measuredFrom: "2026-02-12",
      incomplete: false,
      gain: "512.00",
      balance: "12374.50",
      series: [
        { on: "2026-02-12", gain: "0" },
        { on: "2026-02-13", gain: "84.10" },
        { on: "2026-03-02", gain: "512.00" },
      ],
      topHoldings: [
        { share: exampleFund, weightPercent: "46.2" },
        { share: exampleBank, weightPercent: "25.0" },
      ],
      holdingCount: 2,
    },
    {
      member: {
        id: "1c7a4d2f-9b3e-4d8f-a021-3c4d5e6f7a81",
        displayName: "Sam Rivera",
        avatarUrl: null,
        color: 5,
      },
      firstEntryOn: null,
      measuredFrom: null,
      incomplete: false,
      gain: null,
      balance: null,
      series: [],
      topHoldings: [],
      holdingCount: 0,
    },
  ],
};

const [eurOption, percentOption] = membersSchema.options;

describe("GET /members", () => {
  it("is declared for every role, with the session and input codes", () => {
    const { route, meta, errorMap } = getMembers["~orpc"];
    expect(route).toMatchObject({ method: "GET", path: "/members" });
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
    const input = getMembers["~orpc"].inputSchema;
    expect(input?.safeParse({ period: "3M", unit: "eur" }).success).toBe(true);
    expect(input?.safeParse({ period: "3M" }).success).toBe(false);
    expect(input?.safeParse({ period: "3m", unit: "eur" }).success).toBe(false);
  });

  it("accepts members in euros or percent, a member not started among them", () => {
    expect(membersSchema.parse(members)).toEqual(members);
    const inPercent = { ...members, unit: "percent" };
    expect(membersSchema.parse(inPercent)).toEqual(inPercent);
  });

  it("refuses more than three top holdings, a missing unit, and amounts as numbers", () => {
    const [alex] = members.members;
    const holding = { share: exampleFund, weightPercent: "10" };
    const tooMany = {
      ...members,
      members: [{ ...alex, topHoldings: Array(4).fill(holding) }],
    };
    expect(membersSchema.safeParse(tooMany).success).toBe(false);
    const { unit: _, ...withoutUnit } = members;
    expect(membersSchema.safeParse(withoutUnit).success).toBe(false);
    const asNumber = { ...members, members: [{ ...alex, balance: 12374.5 }] };
    expect(membersSchema.safeParse(asNumber).success).toBe(false);
  });

  it("marks names and pictures personal, the balance and euro gains euro, and keeps percentages", () => {
    const eurRow = eurOption.shape.members.element.shape;
    const percentRow = percentOption.shape.members.element.shape;
    expect(anonymizeKind(eurRow.member.shape.displayName)).toBe("personal");
    expect(anonymizeKind(eurRow.member.shape.avatarUrl)).toBe("personal");
    expect(anonymizeKind(eurRow.gain)).toBe("euro");
    expect(anonymizeKind(eurRow.series.element.shape.gain)).toBe("euro");
    expect(anonymizeKind(eurRow.balance)).toBe("euro");
    expect(anonymizeKind(percentRow.balance)).toBe("euro");
    expect(anonymizeKind(percentRow.gain)).toBeUndefined();
    expect(anonymizeKind(percentRow.series.element.shape.gain)).toBeUndefined();
    expect(
      anonymizeKind(eurRow.topHoldings.element.shape.weightPercent),
    ).toBeUndefined();
  });

  it("is in the OpenAPI document, with its roles, markers and error codes", async () => {
    const operation = (await createOpenApiDocument()).paths?.["/members"]?.get;
    expect(operation).toMatchObject({
      operationId: "race.members",
      "x-roles": ["admin", "member", "guest", "anonymous"],
    });
    expect(Object.keys(operation?.responses ?? {}).sort()).toEqual([
      "200",
      "400",
      "401",
      "500",
    ]);
    const json = JSON.stringify(operation?.responses?.["200"]);
    // gain and series in euros, and the balance in both units.
    expect(json.match(/"x-anonymize":"euro"/g)).toHaveLength(4);
  });
});
