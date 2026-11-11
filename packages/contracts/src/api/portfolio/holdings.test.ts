import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../../anonymize.js";
import { createOpenApiDocument } from "../../openapi.js";
import {
  getPortfolio,
  type Portfolio,
  type PortfolioHolding,
  portfolioHoldingSchema,
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
  latestPrice: { at: "2026-03-02T17:30:00+01:00", priceEur: "12.40" },
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
  pricesAt: "2026-03-02T17:30:00+01:00",
  balanceEur: "1001.67",
  sharesEur: "921.67",
  cashEur: "80.00",
  cashWeight: "7.9",
  gain: { eur: "-18.30", percent: "-1.79" },
  firstEntryAt: "2026-02-20T12:00:00+01:00",
  measuredFromFirstEntry: true,
  incomplete: true,
  holdings: [priced, pending],
};

describe("GET /users/{userId}/portfolio", () => {
  it("is declared for every signed-in role, with its codes", () => {
    const { route, meta, errorMap } = getPortfolio["~orpc"];
    expect(route).toMatchObject({
      method: "GET",
      path: "/users/{userId}/portfolio",
    });
    expect(meta.roles).toEqual(["admin", "member", "guest", "anonymous"]);
    expect(Object.keys(errorMap).sort()).toEqual(
      [
        "access_ended",
        "internal_error",
        "invalid_request",
        "not_found",
        "unauthenticated",
      ].sort(),
    );
  });

  it("takes the member and a period, and refuses anything else", () => {
    const input = getPortfolio["~orpc"].inputSchema;
    expect(input?.safeParse({ userId, period: "1M" }).success).toBe(true);
    expect(input?.safeParse({ userId }).success).toBe(false);
    expect(input?.safeParse({ userId, period: "2Y" }).success).toBe(false);
    expect(input?.safeParse({ userId: "alex", period: "1M" }).success).toBe(
      false,
    );
  });

  it("accepts a portfolio with a priced and a pending holding", () => {
    expect(portfolioSchema.parse(portfolio)).toEqual(portfolio);
  });

  it("accepts an empty portfolio", () => {
    const empty: Portfolio = {
      pricesAt: null,
      balanceEur: "0",
      sharesEur: "0",
      cashEur: "0",
      cashWeight: null,
      gain: { eur: "0", percent: null },
      firstEntryAt: null,
      measuredFromFirstEntry: false,
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
      portfolioSchema.safeParse({ ...portfolio, pricesAt: "2026-03-02T17:30" })
        .success,
    ).toBe(false);
    const { incomplete: _, ...withoutMarker } = portfolio;
    expect(portfolioSchema.safeParse(withoutMarker).success).toBe(false);
  });

  it("marks euro amounts, quantities and cash, and keeps prices and weights", () => {
    const marks = {
      balanceEur: anonymizeKind(portfolioSchema.shape.balanceEur),
      sharesEur: anonymizeKind(portfolioSchema.shape.sharesEur),
      cashEur: anonymizeKind(portfolioSchema.shape.cashEur),
      cashWeight: anonymizeKind(portfolioSchema.shape.cashWeight),
      gainEur: anonymizeKind(portfolioSchema.shape.gain.shape.eur),
      gainPercent: anonymizeKind(portfolioSchema.shape.gain.shape.percent),
      quantity: anonymizeKind(portfolioHoldingSchema.shape.quantity),
      valueEur: anonymizeKind(portfolioHoldingSchema.shape.valueEur),
      weight: anonymizeKind(portfolioHoldingSchema.shape.weight.unwrap()),
      latestPrice: anonymizeKind(
        portfolioHoldingSchema.shape.latestPrice.unwrap().shape.priceEur,
      ),
    };
    expect(marks).toEqual({
      balanceEur: "euro",
      sharesEur: "euro",
      cashEur: "quantity",
      cashWeight: undefined,
      gainEur: "euro",
      gainPercent: undefined,
      quantity: "quantity",
      valueEur: "euro",
      weight: undefined,
      latestPrice: undefined,
    });
  });

  it("is in the OpenAPI document, with its roles and markers", async () => {
    const operation = (await createOpenApiDocument()).paths?.[
      "/users/{userId}/portfolio"
    ]?.get;

    expect(operation).toMatchObject({
      operationId: "portfolio.get",
      tags: ["portfolio"],
      "x-roles": ["admin", "member", "guest", "anonymous"],
      parameters: expect.arrayContaining([
        expect.objectContaining({ name: "userId", in: "path" }),
        expect.objectContaining({ name: "period", in: "query" }),
      ]),
    });
    expect(operation?.responses).toMatchObject({
      "200": {
        content: {
          "application/json": {
            schema: {
              properties: {
                balanceEur: { "x-anonymize": "euro" },
                cashEur: { "x-anonymize": "quantity" },
                holdings: {
                  items: {
                    properties: {
                      quantity: { "x-anonymize": "quantity" },
                      valueEur: { "x-anonymize": "euro" },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  });
});
