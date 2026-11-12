import { describe, expect, it } from "vitest";
import {
  type ShareDetail,
  type ShareHolder,
  shareDetailSchema,
  shareHolderSchema,
  shareHoldersSchema,
  sharePricesQuerySchema,
  sharePricesSchema,
  shareQuerySchema,
} from "./share.js";

const shareId = "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f71";

const detail: ShareDetail = {
  id: shareId,
  isin: "LU000EXMPL16",
  name: "Example Tracker",
  kind: "market",
  symbol: "EXT.XETRA",
  exchange: "XETRA",
  tradingCurrency: "EUR",
  historyStartsOn: "2025-11-12",
  latestPrice: {
    at: "2026-03-02T16:30:00Z",
    priceEur: "112.48",
    source: "intraday",
  },
  change: { eur: "3.02", percent: "2.76" },
  position: {
    quantity: "12",
    valueEur: "1349.76",
    weight: "10.9",
    gain: { eur: "80.16", percent: "6.31" },
  },
};

const holder: ShareHolder = {
  person: {
    id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70",
    displayName: "Alex Martin",
    avatarUrl: "/api/users/0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70/avatar",
    color: 3,
  },
  quantity: "12",
  valueEur: "1349.76",
  weight: "10.9",
  gain: { eur: "80.16", percent: "6.31" },
  changes: [
    {
      id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f72",
      quantityDelta: "15",
      effectiveAt: "2026-01-05T09:00:00+01:00",
    },
    {
      id: "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f73",
      quantityDelta: "-3",
      effectiveAt: "2026-02-10T14:12:00+01:00",
    },
  ],
};

describe("GET /shares/{id}", () => {
  it("takes the share's id and the period", () => {
    const input = shareQuerySchema;
    expect(input.safeParse({ id: shareId, period: "3M" }).success).toBe(true);
    expect(input.safeParse({ id: "42", period: "3M" }).success).toBe(false);
    expect(input.safeParse({ id: shareId }).success).toBe(false);
  });

  it("accepts a market share with a position, and a manual share without", () => {
    expect(shareDetailSchema.parse(detail)).toEqual(detail);
    expect(
      shareDetailSchema.safeParse({
        ...detail,
        kind: "manual",
        symbol: null,
        exchange: null,
        tradingCurrency: null,
        historyStartsOn: null,
        latestPrice: { ...detail.latestPrice, source: "manual" },
        position: null,
      }).success,
    ).toBe(true);
  });

  it("refuses a moment as the history's start, or a quantity as a number", () => {
    expect(
      shareDetailSchema.safeParse({
        ...detail,
        historyStartsOn: "2025-11-12T00:00:00Z",
      }).success,
    ).toBe(false);
    expect(
      shareDetailSchema.safeParse({
        ...detail,
        position: { ...detail.position, quantity: 12 },
      }).success,
    ).toBe(false);
  });
});

describe("GET /shares/{id}/prices", () => {
  it("takes a range among the periods", () => {
    const input = sharePricesQuerySchema;
    expect(input.safeParse({ id: shareId, range: "1D" }).success).toBe(true);
    expect(input.safeParse({ id: shareId, range: "5Y" }).success).toBe(false);
  });

  it("accepts chart points, and none for a share nobody held", () => {
    const prices = {
      points: [{ at: "2026-03-02T09:30:00+01:00", priceEur: "112.10" }],
    };
    expect(sharePricesSchema.parse(prices)).toEqual(prices);
    expect(sharePricesSchema.safeParse({ points: [] }).success).toBe(true);
    expect(
      sharePricesSchema.safeParse({
        points: [{ at: "2026-03-02", priceEur: "112.10" }],
      }).success,
    ).toBe(false);
  });
});

describe("GET /shares/{id}/holders", () => {
  it("accepts each holder with their changes and result", () => {
    expect(shareHoldersSchema.parse({ holders: [holder] })).toEqual({
      holders: [holder],
    });
    expect(
      shareHolderSchema.safeParse({ ...holder, person: null }).success,
    ).toBe(false);
    expect(
      shareHolderSchema.safeParse({
        ...holder,
        changes: [{ ...holder.changes[0], quantityDelta: 15 }],
      }).success,
    ).toBe(false);
  });
});
