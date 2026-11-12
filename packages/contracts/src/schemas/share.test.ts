import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../anonymize.js";
import {
  isinTakenDetailsSchema,
  type LookupResult,
  latestPriceSchema,
  listingSchema,
  lookupQuerySchema,
  lookupResultSchema,
  pricePointSchema,
  priceSources,
  shareNameSchema,
  symbolSchema,
  valueChangedDetailsSchema,
} from "./share.js";

const listing = {
  symbol: "EXT.US",
  name: "Example Tracker",
  exchange: "US",
  tradingCurrency: "USD",
};

describe("shareNameSchema", () => {
  it("trims, and refuses an empty name or one over 100 characters", () => {
    expect(shareNameSchema.parse("  Example Fund ")).toBe("Example Fund");
    expect(shareNameSchema.safeParse("x".repeat(100)).success).toBe(true);
    expect(shareNameSchema.safeParse("   ").success).toBe(false);
    expect(shareNameSchema.safeParse("x".repeat(101)).success).toBe(false);
  });
});

describe("symbolSchema", () => {
  it("trims, and refuses an empty symbol or one over 40 characters", () => {
    expect(symbolSchema.parse(" EXF.PA ")).toBe("EXF.PA");
    expect(symbolSchema.safeParse("").success).toBe(false);
    expect(symbolSchema.safeParse("X".repeat(41)).success).toBe(false);
  });
});

describe("lookupQuerySchema", () => {
  it("trims, and refuses an empty query or one over 100 characters", () => {
    expect(lookupQuerySchema.parse(" QZ0EXAMPLE16 ")).toBe("QZ0EXAMPLE16");
    expect(lookupQuerySchema.safeParse("  ").success).toBe(false);
    expect(lookupQuerySchema.safeParse("x".repeat(101)).success).toBe(false);
  });
});

describe("listingSchema", () => {
  it("accepts a listing without an ISIN, and refuses a bad currency", () => {
    expect(listingSchema.parse(listing)).toEqual(listing);
    expect(
      listingSchema.safeParse({ ...listing, tradingCurrency: "usd" }).success,
    ).toBe(false);
  });
});

describe("lookupResultSchema", () => {
  const result: LookupResult = {
    shares: [
      {
        id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70",
        isin: "QZ0EXAMPLE16",
        name: "Example Fund",
        kind: "market",
        symbol: "EXF.PA",
      },
    ],
    listings: [listing],
  };

  it("accepts the stored shares and the listings with no ISIN", () => {
    expect(lookupResultSchema.parse(result)).toEqual(result);
    expect(
      lookupResultSchema.safeParse({ shares: [], listings: [] }).success,
    ).toBe(true);
  });

  it("refuses a result missing either list", () => {
    expect(
      lookupResultSchema.safeParse({ shares: result.shares }).success,
    ).toBe(false);
    expect(
      lookupResultSchema.safeParse({
        shares: [],
        listingsWithoutIsin: [listing],
      }).success,
    ).toBe(false);
  });
});

describe("pricePointSchema", () => {
  it("accepts a price above zero, and refuses zero", () => {
    const point = { at: "2026-03-02T16:30:00Z", priceEur: "40.10" };
    expect(pricePointSchema.parse(point)).toEqual(point);
    expect(
      pricePointSchema.safeParse({ ...point, priceEur: "0" }).success,
    ).toBe(false);
  });
});

describe("latestPriceSchema", () => {
  const price = { at: "2026-03-02T16:30:00Z", priceEur: "40.10" };

  it.each(priceSources)("accepts a %s price", (source) => {
    expect(latestPriceSchema.safeParse({ ...price, source }).success).toBe(
      true,
    );
  });

  it("refuses an unknown or missing source", () => {
    expect(
      latestPriceSchema.safeParse({ ...price, source: "estimate" }).success,
    ).toBe(false);
    expect(latestPriceSchema.safeParse(price).success).toBe(false);
  });

  it("keeps the price unmarked, as market data", () => {
    expect(anonymizeKind(latestPriceSchema.shape.priceEur)).toBeUndefined();
  });
});

describe("error details", () => {
  it("names the share that has the ISIN", () => {
    const details = { shareId: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70" };
    expect(isinTakenDetailsSchema.parse(details)).toEqual(details);
    expect(isinTakenDetailsSchema.safeParse({}).success).toBe(false);
  });

  it("carries the stored price of a value point", () => {
    expect(valueChangedDetailsSchema.parse({ priceEur: "41.00" })).toEqual({
      priceEur: "41.00",
    });
    expect(valueChangedDetailsSchema.safeParse({}).success).toBe(false);
  });
});
