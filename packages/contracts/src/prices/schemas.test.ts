import { describe, expect, it } from "vitest";
import { pricesHistorySchema, pricesValuePointSchema } from "./schemas.js";

describe("pricesValuePointSchema", () => {
  const point = {
    at: "2026-03-02T05:10:00+01:00",
    priceEur: "40.10",
    enteredBy: null,
  };

  it("accepts a value point whose member was deleted", () => {
    expect(pricesValuePointSchema.parse(point)).toEqual(point);
  });

  it("refuses a price of zero, as the API does", () => {
    expect(
      pricesValuePointSchema.safeParse({ ...point, priceEur: "0" }).success,
    ).toBe(false);
  });
});

describe("pricesHistorySchema", () => {
  it("accepts the day the history starts, or none", () => {
    expect(pricesHistorySchema.parse({ historyStartsOn: null })).toEqual({
      historyStartsOn: null,
    });
    expect(
      pricesHistorySchema.safeParse({ historyStartsOn: "2025-03-02" }).success,
    ).toBe(true);
  });
});
