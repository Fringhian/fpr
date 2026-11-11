import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../../anonymize.js";
import {
  type ShareQuote,
  shareCurrencySchema,
  shareLatestPriceSchema,
  shareNameSchema,
  sharePositionSchema,
  sharePriceEurSchema,
  shareQuoteSchema,
} from "./schemas.js";

const quote: ShareQuote = {
  id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f71",
  isin: "FR000EXMPL06",
  name: "Example Fund",
  kind: "market",
  symbol: "EXF.PA",
  latestPrice: {
    at: "2026-03-02T16:30:00Z",
    priceEur: "40.10",
    source: "intraday",
  },
  changeEur: "-0.90",
  changePercent: "-2.2",
};

describe("sharePriceEurSchema", () => {
  it.each(["40.10", "0.5", "1250"])("accepts %s", (price) => {
    expect(sharePriceEurSchema.safeParse(price).success).toBe(true);
  });

  it.each(["0", "0.00", "-1", "1e3", "abc", 40])("refuses %j", (price) => {
    expect(sharePriceEurSchema.safeParse(price).success).toBe(false);
  });
});

describe("shareNameSchema", () => {
  it("trims, and refuses an empty or overlong name", () => {
    expect(shareNameSchema.parse("  Example Fund ")).toBe("Example Fund");
    expect(shareNameSchema.safeParse("   ").success).toBe(false);
    expect(shareNameSchema.safeParse("x".repeat(201)).success).toBe(false);
  });
});

describe("shareCurrencySchema", () => {
  it("accepts a currency code and refuses anything else", () => {
    expect(shareCurrencySchema.safeParse("GBX").success).toBe(true);
    expect(shareCurrencySchema.safeParse("eur").success).toBe(false);
    expect(shareCurrencySchema.safeParse("EURO").success).toBe(false);
  });
});

describe("shareQuoteSchema", () => {
  it("accepts a share with its latest price, or none yet", () => {
    expect(shareQuoteSchema.parse(quote)).toEqual(quote);
    expect(
      shareQuoteSchema.safeParse({
        ...quote,
        latestPrice: null,
        changeEur: null,
        changePercent: null,
      }).success,
    ).toBe(true);
  });

  it("refuses an unknown price source or a price as a number", () => {
    expect(
      shareLatestPriceSchema.safeParse({
        ...quote.latestPrice,
        source: "estimate",
      }).success,
    ).toBe(false);
    expect(
      shareQuoteSchema.safeParse({ ...quote, changeEur: -0.9 }).success,
    ).toBe(false);
  });

  it("keeps share prices and changes unmarked, as market data", () => {
    expect(anonymizeKind(shareQuoteSchema.shape.latestPrice)).toBeUndefined();
    expect(
      anonymizeKind(shareLatestPriceSchema.shape.priceEur),
    ).toBeUndefined();
    expect(anonymizeKind(shareQuoteSchema.shape.changeEur)).toBeUndefined();
  });
});

describe("sharePositionSchema", () => {
  it("accepts a position, with no value while the share has no price", () => {
    const position = {
      quantity: "74.328",
      valueEur: "2980.55",
      gainSinceBoughtEur: "120.40",
      gainSinceBoughtPercent: "4.2",
    };
    expect(sharePositionSchema.parse(position)).toEqual(position);
    expect(
      sharePositionSchema.safeParse({
        ...position,
        valueEur: null,
        gainSinceBoughtEur: null,
        gainSinceBoughtPercent: null,
      }).success,
    ).toBe(true);
  });

  it("marks the quantity and the euro amounts", () => {
    const { shape } = sharePositionSchema;
    expect(anonymizeKind(shape.quantity)).toBe("quantity");
    expect(anonymizeKind(shape.valueEur)).toBe("euro");
    expect(anonymizeKind(shape.gainSinceBoughtEur)).toBe("euro");
    expect(anonymizeKind(shape.gainSinceBoughtPercent)).toBeUndefined();
  });
});
