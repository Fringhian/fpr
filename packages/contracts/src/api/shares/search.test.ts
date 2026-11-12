import { describe, expect, it } from "vitest";
import { type LookupResult, lookupResultSchema } from "../../schemas/share.js";

import {
  type ShareListItem,
  shareListItemSchema,
  shareListSchema,
  shareLookupBodySchema,
  shareSearchQuerySchema,
} from "./search.js";

const item: ShareListItem = {
  id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f71",
  isin: "FR000EXMPL06",
  name: "Example Fund",
  kind: "market",
  symbol: "EXF.PA",
  latestPrice: {
    at: "2026-03-02T16:30:00Z",
    priceEur: "40.10",
    source: "close",
  },
  change: { eur: "1.10", percent: "2.8" },
  series: [
    { at: "2026-02-27T22:59:59Z", priceEur: "39.00" },
    { at: "2026-03-02T22:59:59Z", priceEur: "40.10" },
  ],
  holders: [
    {
      id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70",
      displayName: "Alex Martin",
      avatarUrl: null,
      color: 3,
    },
  ],
};

describe("GET /shares", () => {
  it("reads an empty filter as every share, and trims the filter", () => {
    expect(shareSearchQuerySchema.parse({ period: "1M" })).toEqual({
      q: "",
      period: "1M",
    });
    expect(
      shareSearchQuerySchema.parse({ q: "  example ", period: "YTD" }).q,
    ).toBe("example");
  });

  it("refuses a missing or unknown period, or an overlong filter", () => {
    expect(shareSearchQuerySchema.safeParse({ q: "fund" }).success).toBe(false);
    expect(shareSearchQuerySchema.safeParse({ period: "2Y" }).success).toBe(
      false,
    );
    expect(
      shareSearchQuerySchema.safeParse({ q: "x".repeat(101), period: "1D" })
        .success,
    ).toBe(false);
  });

  it("accepts a list of shares, and a share with no price or holder yet", () => {
    expect(shareListSchema.parse({ shares: [item] })).toEqual({
      shares: [item],
    });
    expect(
      shareListItemSchema.safeParse({
        ...item,
        latestPrice: null,
        change: null,
        series: [],
        holders: [],
      }).success,
    ).toBe(true);
  });

  it("refuses a price as a number, or a holder without a colour", () => {
    expect(
      shareListItemSchema.safeParse({
        ...item,
        series: [{ at: "2026-03-02T22:59:59Z", priceEur: 40.1 }],
      }).success,
    ).toBe(false);
    expect(
      shareListItemSchema.safeParse({
        ...item,
        holders: [{ ...item.holders[0], color: undefined }],
      }).success,
    ).toBe(false);
  });
});

describe("POST /shares/lookup", () => {
  const result: LookupResult = {
    shares: [
      {
        id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f71",
        isin: "FR000EXMPL06",
        name: "Example Fund",
        kind: "market",
        symbol: "EXF.PA",
      },
    ],
    listings: [
      {
        symbol: "EXT.LSE",
        name: "Example Tracker",
        exchange: "LSE",
        tradingCurrency: "GBX",
      },
    ],
  };

  it("accepts a query, and a listing's symbol with the ISIN a member typed", () => {
    expect(shareLookupBodySchema.parse({ query: " EXF " })).toEqual({
      query: "EXF",
    });
    expect(
      shareLookupBodySchema.safeParse({
        query: "EXT.LSE",
        isin: "IE000EXMPL24",
      }).success,
    ).toBe(true);
  });

  it("refuses an empty or overlong query, or an invalid ISIN", () => {
    expect(shareLookupBodySchema.safeParse({ query: "  " }).success).toBe(
      false,
    );
    expect(
      shareLookupBodySchema.safeParse({ query: "x".repeat(101) }).success,
    ).toBe(false);
    expect(
      shareLookupBodySchema.safeParse({
        query: "EXT.LSE",
        isin: "ie000exmpl24",
      }).success,
    ).toBe(false);
  });

  it("accepts the stored shares and the listings without an ISIN", () => {
    expect(lookupResultSchema.parse(result)).toEqual(result);
    expect(
      lookupResultSchema.safeParse({ shares: [], listings: [] }).success,
    ).toBe(true);
    expect(
      lookupResultSchema.safeParse({
        ...result,
        listings: [{ ...result.listings[0], tradingCurrency: "pence" }],
      }).success,
    ).toBe(false);
  });
});
