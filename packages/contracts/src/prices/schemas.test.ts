import { describe, expect, it } from "vitest";
import {
  type PricesLookupResult,
  pricesCurrencySchema,
  pricesLookupResultSchema,
  pricesPriceEurSchema,
  pricesShareNameSchema,
  pricesValuePointSchema,
} from "./schemas.js";

describe("pricesPriceEurSchema", () => {
  it.each(["0", "40", "40.10", "0.0001"])("accepts %s", (price) => {
    expect(pricesPriceEurSchema.safeParse(price).success).toBe(true);
  });

  it.each(["-1", "-0.5", "1e3", "40,10", "", 40])("refuses %j", (price) => {
    expect(pricesPriceEurSchema.safeParse(price).success).toBe(false);
  });
});

describe("pricesShareNameSchema", () => {
  it("trims the name, and refuses an empty or overlong one", () => {
    expect(pricesShareNameSchema.parse("  Example Fund ")).toBe("Example Fund");
    expect(pricesShareNameSchema.safeParse("   ").success).toBe(false);
    expect(pricesShareNameSchema.safeParse("x".repeat(101)).success).toBe(
      false,
    );
  });
});

describe("pricesCurrencySchema", () => {
  it("accepts a currency code, pence included, and refuses anything else", () => {
    expect(pricesCurrencySchema.safeParse("EUR").success).toBe(true);
    expect(pricesCurrencySchema.safeParse("GBX").success).toBe(true);
    expect(pricesCurrencySchema.safeParse("eur").success).toBe(false);
    expect(pricesCurrencySchema.safeParse("EURO").success).toBe(false);
  });
});

describe("pricesLookupResultSchema", () => {
  const result: PricesLookupResult = {
    shares: [
      {
        id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70",
        isin: "QZ0EXAMPLE16",
        name: "Example Fund",
        kind: "market",
        symbol: "EXF.PA",
      },
    ],
    listings: [
      {
        symbol: "EXT.US",
        name: "Example Tracker",
        exchange: "US",
        tradingCurrency: "USD",
      },
    ],
  };

  it("accepts the stored shares and the listings with no ISIN", () => {
    expect(pricesLookupResultSchema.parse(result)).toEqual(result);
    expect(
      pricesLookupResultSchema.safeParse({ shares: [], listings: [] }).success,
    ).toBe(true);
  });

  it("refuses a result missing either list", () => {
    expect(
      pricesLookupResultSchema.safeParse({ shares: result.shares }).success,
    ).toBe(false);
  });
});

describe("pricesValuePointSchema", () => {
  it("accepts a value point whose member was deleted", () => {
    const point = {
      at: "2026-03-02T05:10:00+01:00",
      priceEur: "40.10",
      enteredBy: null,
    };
    expect(pricesValuePointSchema.parse(point)).toEqual(point);
  });
});
