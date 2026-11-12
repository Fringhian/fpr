import { describe, expect, it } from "vitest";
import {
  pricesAddManualPriceInputSchema,
  pricesDeleteManualPriceInputSchema,
  pricesUpdateManualPriceInputSchema,
} from "./manual-prices.js";

const shareId = "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70";
const memberId = "1c7a4d2f-9b3e-4d8f-8a21-3c4d5e6f7081";
const at = "2026-03-02T05:10:00+01:00";

describe("POST /shares/{id}/manual-prices", () => {
  it("accepts a value point entered by a member", () => {
    const input = { id: shareId, at, priceEur: "40", enteredBy: memberId };
    expect(pricesAddManualPriceInputSchema.parse(input)).toEqual(input);
  });

  it.each([
    ["a day without its time", { at: "2026-03-02" }],
    ["a price as a number", { priceEur: 40 }],
    ["no member", { enteredBy: undefined }],
  ])("refuses %s", (_, change) => {
    expect(
      pricesAddManualPriceInputSchema.safeParse({
        id: shareId,
        at,
        priceEur: "40",
        enteredBy: memberId,
        ...change,
      }).success,
    ).toBe(false);
  });
});

describe("PATCH /shares/{id}/manual-prices/{at}", () => {
  const input = {
    id: shareId,
    at,
    priceEur: "40.10",
    expectedPriceEur: "41.00",
    enteredBy: memberId,
  };

  it("accepts a new price with the price the member saw", () => {
    expect(pricesUpdateManualPriceInputSchema.parse(input)).toEqual(input);
  });

  it("refuses an edit without the price the member saw", () => {
    expect(
      pricesUpdateManualPriceInputSchema.safeParse({
        ...input,
        expectedPriceEur: undefined,
      }).success,
    ).toBe(false);
  });
});

describe("DELETE /shares/{id}/manual-prices/{at}", () => {
  const input = {
    id: shareId,
    at,
    expectedPriceEur: "41.00",
    deletedBy: memberId,
  };

  it("accepts the price the member saw and who deletes it", () => {
    expect(pricesDeleteManualPriceInputSchema.parse(input)).toEqual(input);
    expect(
      pricesDeleteManualPriceInputSchema.safeParse({
        ...input,
        deletedBy: undefined,
      }).success,
    ).toBe(false);
  });
});

describe("{at} in a value point's path", () => {
  const schemas = [
    pricesUpdateManualPriceInputSchema.shape.at,
    pricesDeleteManualPriceInputSchema.shape.at,
  ];

  it("is one path segment once percent-encoded, as oRPC's client sends it", () => {
    const segment = encodeURIComponent(at);
    expect(segment).toBe("2026-03-02T05%3A10%3A00%2B01%3A00");
    expect(segment).not.toMatch(/[/+:]/);
  });

  it.each([at, "2026-03-02T04:10:00Z", "2026-03-02T04:10:00.000Z"])(
    "accepts %s once decoded",
    (moment) => {
      const decoded = decodeURIComponent(encodeURIComponent(moment));
      for (const schema of schemas) {
        expect(schema.parse(decoded)).toBe(moment);
      }
    },
  );

  it("keeps a + that arrives unencoded, since a path isn't a query", () => {
    for (const schema of schemas) {
      expect(schema.safeParse(decodeURIComponent(at)).success).toBe(true);
    }
  });

  it.each([
    "2026-03-02",
    "2026-03-02T05:10:00",
    "2026-03-02T05:10:00 01:00",
    "1772424600",
    "latest",
  ])("refuses %j", (moment) => {
    for (const schema of schemas) {
      expect(schema.safeParse(moment).success).toBe(false);
    }
  });
});
