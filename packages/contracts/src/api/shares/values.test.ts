import { describe, expect, it } from "vitest";
import { valueChangedDetailsSchema } from "../../schemas/share.js";
import {
  addShareValue,
  type ShareValue,
  type ShareValueEvent,
  shareValueDeleteBodySchema,
  shareValueEventSchema,
  shareValueEventsSchema,
  shareValueParamsSchema,
  shareValueSchema,
  shareValuesSchema,
  shareValueUpdateBodySchema,
  updateShareValue,
} from "./values.js";

const shareId = "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f71";

const alex = {
  id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70",
  displayName: "Alex Martin",
  avatarUrl: null,
  color: 3,
};

const value: ShareValue = {
  at: "2026-03-02T05:10:00+01:00",
  priceEur: "40.10",
  enteredBy: alex,
};

const events: ShareValueEvent[] = [
  {
    id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f74",
    action: "deleted",
    at: "2026-03-09T05:10:00+01:00",
    priceEur: null,
    previousPriceEur: "40.50",
    madeBy: null,
    madeAt: "2026-03-10T08:00:00Z",
  },
  {
    id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f75",
    action: "edited",
    at: "2026-03-02T05:10:00+01:00",
    priceEur: "40.10",
    previousPriceEur: "41.00",
    madeBy: alex,
    madeAt: "2026-03-03T12:00:00Z",
  },
  {
    id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f76",
    action: "added",
    at: "2026-03-02T05:10:00+01:00",
    priceEur: "41.00",
    previousPriceEur: null,
    madeBy: alex,
    madeAt: "2026-03-02T09:00:00Z",
  },
];

describe("GET /shares/{id}/values", () => {
  it("accepts value points, one entered by a deleted person, and none", () => {
    const values = { values: [value, { ...value, enteredBy: null }] };
    expect(shareValuesSchema.parse(values)).toEqual(values);
    expect(shareValuesSchema.safeParse({ values: [] }).success).toBe(true);
    expect(
      shareValueSchema.safeParse({ ...value, priceEur: 40.1 }).success,
    ).toBe(false);
  });
});

describe("GET /shares/{id}/value-events", () => {
  it("accepts an addition, an edit, and a deletion", () => {
    expect(shareValueEventsSchema.parse({ events })).toEqual({ events });
  });

  it.each([
    [
      "an addition with a previous value",
      { ...events[2], previousPriceEur: "1" },
    ],
    [
      "an edit without its previous value",
      { ...events[1], previousPriceEur: null },
    ],
    ["a deletion with a new value", { ...events[0], priceEur: "40.50" }],
    ["an unknown action", { ...events[1], action: "replaced" }],
  ])("refuses %s", (_, event) => {
    expect(shareValueEventSchema.safeParse(event).success).toBe(false);
  });
});

describe("POST /shares/{id}/values", () => {
  const input = addShareValue["~orpc"].inputSchema;

  it("accepts a moment and a value above zero", () => {
    const body = { at: value.at, priceEur: value.priceEur };
    expect(input?.parse({ id: shareId, ...body })).toEqual({
      id: shareId,
      ...body,
    });
  });

  it.each([
    ["a value of zero", { priceEur: "0" }],
    ["a day without its time", { at: "2026-03-02" }],
    ["a moment without its offset", { at: "2026-03-02T05:10:00" }],
  ])("refuses %s", (_, change) => {
    expect(
      input?.safeParse({
        id: shareId,
        at: value.at,
        priceEur: value.priceEur,
        ...change,
      }).success,
    ).toBe(false);
  });
});

describe("{at} in a value point's path", () => {
  it.each([
    "2026-03-02T05:10:00+01:00",
    "2026-03-02T04:10:00Z",
    "2026-03-02T04:10:00.123456Z",
  ])("round-trips %s as one percent-encoded path segment", (at) => {
    const segment = encodeURIComponent(at);
    expect(segment).not.toMatch(/[/+:]/);
    expect(
      shareValueParamsSchema.parse({
        id: shareId,
        at: decodeURIComponent(segment),
      }),
    ).toEqual({ id: shareId, at });
  });

  it("accepts a `+` sent unencoded, which a path keeps", () => {
    expect(
      shareValueParamsSchema.safeParse({
        id: shareId,
        at: decodeURIComponent("2026-03-02T05:10:00+01:00"),
      }).success,
    ).toBe(true);
  });

  it.each([
    "2026-03-02",
    "2026-03-02T05:10:00",
    "2026-03-02T05:10:00 01:00",
    "2026-13-02T05:10:00Z",
    "1772424600000",
    "",
  ])("refuses %j", (at) => {
    expect(shareValueParamsSchema.safeParse({ id: shareId, at }).success).toBe(
      false,
    );
  });
});

describe("PATCH /shares/{id}/values/{at}", () => {
  it("takes the new value and the value the editor last saw", () => {
    const body = { priceEur: "40.10", expectedPriceEur: "41.00" };
    expect(shareValueUpdateBodySchema.parse(body)).toEqual(body);
    expect(
      updateShareValue["~orpc"].inputSchema?.safeParse({
        id: shareId,
        at: value.at,
        ...body,
      }).success,
    ).toBe(true);
    expect(
      shareValueUpdateBodySchema.safeParse({ priceEur: "40.10" }).success,
    ).toBe(false);
    expect(
      shareValueUpdateBodySchema.safeParse({
        priceEur: "-1",
        expectedPriceEur: "41.00",
      }).success,
    ).toBe(false);
  });

  it("carries the stored value in value_changed's details", () => {
    expect(valueChangedDetailsSchema.parse({ priceEur: "40.50" })).toEqual({
      priceEur: "40.50",
    });
    expect(
      valueChangedDetailsSchema.safeParse({ priceEur: 40.5 }).success,
    ).toBe(false);
  });
});

describe("DELETE /shares/{id}/values/{at}", () => {
  it("takes the value the editor last saw", () => {
    expect(
      shareValueDeleteBodySchema.safeParse({ expectedPriceEur: "40.10" })
        .success,
    ).toBe(true);
    expect(shareValueDeleteBodySchema.safeParse({}).success).toBe(false);
  });
});
