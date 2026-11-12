import { describe, expect, it } from "vitest";
import { periodQuerySchema, periodSchema, unitSchema } from "./period.js";

describe("periodSchema", () => {
  it.each(["1D", "1W", "1M", "3M", "YTD", "all"])("accepts %s", (input) => {
    expect(periodSchema.parse(input)).toBe(input);
  });

  it.each(["1d", "ALL", "6M", "1Y", ""])("refuses %j", (input) => {
    expect(periodSchema.safeParse(input).success).toBe(false);
  });
});

describe("periodQuerySchema", () => {
  it("takes the period alone, and drops a unit", () => {
    expect(periodQuerySchema.parse({ period: "3M", unit: "eur" })).toEqual({
      period: "3M",
    });
    expect(periodQuerySchema.safeParse({}).success).toBe(false);
    expect(periodQuerySchema.safeParse({ period: "3m" }).success).toBe(false);
  });
});

describe("unitSchema", () => {
  it.each(["eur", "percent"])("accepts %s", (input) => {
    expect(unitSchema.parse(input)).toBe(input);
  });

  it.each(["EUR", "%", "€", "usd", ""])("refuses %j", (input) => {
    expect(unitSchema.safeParse(input).success).toBe(false);
  });
});
