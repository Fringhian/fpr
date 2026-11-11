import { describe, expect, it } from "vitest";
import { periodSchema, unitSchema } from "./period.js";

describe("periodSchema", () => {
  it.each(["1D", "1W", "1M", "3M", "YTD", "all"])("accepts %s", (input) => {
    expect(periodSchema.parse(input)).toBe(input);
  });

  it.each(["1d", "ALL", "6M", "1Y", ""])("refuses %j", (input) => {
    expect(periodSchema.safeParse(input).success).toBe(false);
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
