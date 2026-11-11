import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../../anonymize.js";
import { createOpenApiDocument } from "../../openapi.js";
import { pricesLookup } from "../../prices/shares.js";
import {
  isinTakenDetailsSchema,
  type LookupResult,
  lookupResultSchema,
} from "../../schemas/share.js";
import {
  lookUpShares,
  type ShareListItem,
  searchShares,
  shareListItemSchema,
  shareListSchema,
  shareLookupBodySchema,
  shareSearchQuerySchema,
} from "./search.js";

const document = await createOpenApiDocument();

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
  it("is declared for every signed-in role, with the input's codes", () => {
    const { route, meta, errorMap } = searchShares["~orpc"];
    expect(route).toMatchObject({ method: "GET", path: "/shares" });
    expect(meta.roles).toEqual(["admin", "member", "guest", "anonymous"]);
    expect(Object.keys(errorMap).sort()).toEqual(
      [
        "access_ended",
        "internal_error",
        "invalid_request",
        "unauthenticated",
      ].sort(),
    );
  });

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

  it("marks the holders' names and pictures, and keeps the prices", () => {
    const holder = shareListItemSchema.shape.holders.element.shape;
    expect(anonymizeKind(holder.displayName)).toBe("personal");
    expect(anonymizeKind(holder.avatarUrl)).toBe("personal");
    expect(
      anonymizeKind(shareListItemSchema.shape.series.element.shape.priceEur),
    ).toBeUndefined();
  });

  it("is in the OpenAPI document with its query, roles and markers", () => {
    const operation = document.paths?.["/shares"]?.get;
    expect(operation).toMatchObject({
      summary: "Filter the stored shares",
      tags: ["shares"],
      "x-roles": ["admin", "member", "guest", "anonymous"],
    });
    expect(
      operation?.parameters?.map((parameter) =>
        "in" in parameter ? `${parameter.in}:${parameter.name}` : undefined,
      ),
    ).toEqual(["query:q", "query:period"]);
    expect(operation?.responses?.["200"]).toMatchObject({
      content: {
        "application/json": {
          schema: {
            properties: {
              shares: {
                items: {
                  properties: {
                    holders: {
                      items: {
                        properties: {
                          displayName: { "x-anonymize": "personal" },
                          avatarUrl: { "x-anonymize": "personal" },
                        },
                      },
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

  it("is declared for members and the admin, with the provider's codes", () => {
    const { route, meta, errorMap } = lookUpShares["~orpc"];
    expect(route).toMatchObject({ method: "POST", path: "/shares/lookup" });
    expect(meta.roles).toEqual(["admin", "member"]);
    expect(Object.keys(errorMap).sort()).toEqual(
      [
        "access_ended",
        "call_budget_used",
        "forbidden",
        "internal_error",
        "invalid_request",
        "isin_taken",
        "not_found",
        "provider_unavailable",
        "unauthenticated",
      ].sort(),
    );
    expect(errorMap.isin_taken.data).toBe(isinTakenDetailsSchema);
  });

  it("answers as the price service's lookup does", () => {
    expect(lookUpShares["~orpc"].outputSchema).toBe(lookupResultSchema);
    expect(pricesLookup["~orpc"].outputSchema).toBe(lookupResultSchema);
  });

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

  it("is in the OpenAPI document with the budget and provider codes", () => {
    const operation = document.paths?.["/shares/lookup"]?.post;
    expect(operation).toMatchObject({ "x-roles": ["admin", "member"] });
    expect(operation?.responses).toMatchObject({
      "429": { description: "`call_budget_used`" },
      "503": { description: "`provider_unavailable`" },
    });
  });
});
