import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../../anonymize.js";
import { priceChangeSchema } from "../../schemas/performance.js";
import { latestPriceSchema } from "../../schemas/share.js";
import { type ShareQuote, shareQuoteSchema } from "./schemas.js";

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
  change: { eur: "-0.90", percent: "-2.2" },
};

describe("shareQuoteSchema", () => {
  it("accepts a share with its latest price and change, or none yet", () => {
    expect(shareQuoteSchema.parse(quote)).toEqual(quote);
    expect(
      shareQuoteSchema.safeParse({ ...quote, latestPrice: null, change: null })
        .success,
    ).toBe(true);
  });

  it("refuses an unknown price source, a change without its percent, or a number", () => {
    expect(
      shareQuoteSchema.safeParse({
        ...quote,
        latestPrice: { ...quote.latestPrice, source: "estimate" },
      }).success,
    ).toBe(false);
    expect(
      shareQuoteSchema.safeParse({ ...quote, change: { eur: "-0.90" } })
        .success,
    ).toBe(false);
    expect(
      shareQuoteSchema.safeParse({
        ...quote,
        change: { eur: -0.9, percent: "-2.2" },
      }).success,
    ).toBe(false);
  });

  // The anonymization test skips a price change, so it is checked here.
  it("keeps share prices and changes unmarked, as market data", () => {
    expect(anonymizeKind(shareQuoteSchema.shape.latestPrice)).toBeUndefined();
    expect(anonymizeKind(latestPriceSchema.shape.priceEur)).toBeUndefined();
    expect(anonymizeKind(priceChangeSchema.shape.eur)).toBeUndefined();
    expect(anonymizeKind(priceChangeSchema.shape.percent)).toBeUndefined();
  });
});
