import { describe, expect, it } from "vitest";
import {
  type Portfolio,
  type PortfolioHolding,
  type PortfolioHoldingAt,
  portfolioHoldingAtQuerySchema,
  portfolioHoldingAtSchema,
  portfolioHoldingSchema,
  portfolioQuerySchema,
  portfolioSchema,
} from "./holdings.js";

const userId = "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70";

const priced: PortfolioHolding = {
  share: {
    id: "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
    isin: "FR0000000001",
    name: "Example Fund",
    kind: "market",
    symbol: "EXF.PA",
  },
  quantity: "74.328",
  latestPrice: {
    at: "2026-03-02T17:30:00+01:00",
    priceEur: "12.40",
    source: "intraday",
  },
  valueEur: "921.67",
  weight: "92.1",
  gain: { eur: "-18.30", percent: "-1.95" },
  pricesFrom: null,
  series: [
    { at: "2026-02-27T17:30:00+01:00", priceEur: "12.65" },
    { at: "2026-03-02T17:30:00+01:00", priceEur: "12.40" },
  ],
};

const pending: PortfolioHolding = {
  share: {
    id: "2d3e4f5a-6b7c-4d8e-9f0a-1b2c3d4e5f60",
    isin: "US0000000002",
    name: "Sample Tech Inc.",
    kind: "market",
    symbol: "SMPL.US",
  },
  quantity: "3",
  latestPrice: null,
  valueEur: null,
  weight: null,
  gain: null,
  pricesFrom: null,
  series: [],
};

const portfolio: Portfolio = {
  latestPricesAt: "2026-03-02T17:30:00+01:00",
  balanceEur: "1001.67",
  sharesEur: "921.67",
  sharesWeight: "92.1",
  cashEur: "80.00",
  cashWeight: "7.9",
  gain: { eur: "-18.30", percent: "-1.79" },
  firstEntryOn: "2026-02-20",
  measuredFrom: "2026-02-20",
  incomplete: true,
  holdings: [priced, pending],
};

describe("GET /users/{userId}/portfolio", () => {
  it("takes the member and a period, and refuses anything else", () => {
    const input = portfolioQuerySchema;
    expect(input.safeParse({ userId, period: "1M" }).success).toBe(true);
    expect(input.safeParse({ userId }).success).toBe(false);
    expect(input.safeParse({ userId, period: "2Y" }).success).toBe(false);
    expect(input.safeParse({ userId: "alex", period: "1M" }).success).toBe(
      false,
    );
  });

  it("accepts a portfolio with a priced and a pending holding", () => {
    expect(portfolioSchema.parse(portfolio)).toEqual(portfolio);
  });

  it("accepts an empty portfolio", () => {
    const empty: Portfolio = {
      latestPricesAt: null,
      balanceEur: "0",
      sharesEur: "0",
      sharesWeight: null,
      cashEur: "0",
      cashWeight: null,
      gain: { eur: "0", percent: null },
      firstEntryOn: null,
      measuredFrom: null,
      incomplete: false,
      holdings: [],
    };
    expect(portfolioSchema.safeParse(empty).success).toBe(true);
  });

  it("refuses numbers, a moment without offset, and a missing marker", () => {
    expect(
      portfolioSchema.safeParse({ ...portfolio, balanceEur: 1001.67 }).success,
    ).toBe(false);
    expect(
      portfolioHoldingSchema.safeParse({ ...priced, quantity: "1e3" }).success,
    ).toBe(false);
    expect(
      portfolioSchema.safeParse({
        ...portfolio,
        latestPricesAt: "2026-03-02T17:30",
      }).success,
    ).toBe(false);
    expect(
      portfolioSchema.safeParse({
        ...portfolio,
        measuredFrom: "2026-02-20T12:00:00+01:00",
      }).success,
    ).toBe(false);
    const { incomplete: _, ...withoutMarker } = portfolio;
    expect(portfolioSchema.safeParse(withoutMarker).success).toBe(false);
  });
});

describe("GET /users/{userId}/holdings/{shareId}", () => {
  const shareId = priced.share.id;
  const at = "2026-03-02T17:30:00+01:00";
  const held: PortfolioHoldingAt = {
    share: priced.share,
    at,
    quantity: "74.328",
  };

  it("takes the member, the share, and a moment with its offset", () => {
    const input = portfolioHoldingAtQuerySchema;
    expect(input.safeParse({ userId, shareId, at }).success).toBe(true);
    expect(input.safeParse({ userId, shareId }).success).toBe(false);
    expect(input.safeParse({ userId, shareId, at: "2026-03-02" }).success).toBe(
      false,
    );
    expect(input.safeParse({ userId, shareId: "fund", at }).success).toBe(
      false,
    );
  });

  it("answers the share, the moment, and the quantity held, zero included", () => {
    expect(portfolioHoldingAtSchema.parse(held)).toEqual(held);
    expect(
      portfolioHoldingAtSchema.safeParse({ ...held, quantity: "0" }).success,
    ).toBe(true);
    expect(
      portfolioHoldingAtSchema.safeParse({ ...held, quantity: 74.328 }).success,
    ).toBe(false);
  });
});
