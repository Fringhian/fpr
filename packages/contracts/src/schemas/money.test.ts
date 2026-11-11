import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../anonymize.js";
import { decimalSchema } from "../decimal.js";
import { currencySchema, percentSchema, priceEurSchema } from "./money.js";

describe("currencySchema", () => {
  it("accepts a currency code, pence included, and refuses anything else", () => {
    expect(currencySchema.safeParse("EUR").success).toBe(true);
    expect(currencySchema.safeParse("GBX").success).toBe(true);
    expect(currencySchema.safeParse("eur").success).toBe(false);
    expect(currencySchema.safeParse("EURO").success).toBe(false);
  });
});

describe("priceEurSchema", () => {
  it.each(["40.10", "0.5", "0.0001", "1250"])("accepts %s", (price) => {
    expect(priceEurSchema.safeParse(price).success).toBe(true);
  });

  it.each(["0", "0.00", "-1", "-0.5", "1e3", "40,10", "abc", "", 40])(
    "refuses %j",
    (price) => {
      expect(priceEurSchema.safeParse(price).success).toBe(false);
    },
  );
});

describe("percentSchema", () => {
  it("accepts a decimal string in percent, below zero too", () => {
    for (const percent of ["12.5", "-2.2", "0", "250"]) {
      expect(percentSchema.safeParse(percent).success).toBe(true);
    }
  });

  it("refuses a number or a percent sign", () => {
    expect(percentSchema.safeParse(12.5).success).toBe(false);
    expect(percentSchema.safeParse("12.5%").success).toBe(false);
  });

  it("is its own schema, unmarked", () => {
    expect(percentSchema).not.toBe(decimalSchema);
    expect(anonymizeKind(percentSchema)).toBeUndefined();
  });
});
