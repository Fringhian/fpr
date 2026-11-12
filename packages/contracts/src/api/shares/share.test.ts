import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../../anonymize.js";
import { createOpenApiDocument } from "../../openapi.js";
import { gainSchema } from "../../schemas/performance.js";
import {
  deleteShare,
  getShare,
  getShareHolders,
  getSharePrices,
  type ShareDetail,
  type ShareHolder,
  shareDetailSchema,
  shareHolderChangeSchema,
  shareHolderSchema,
  shareHoldersSchema,
  sharePricesSchema,
} from "./share.js";

const document = await createOpenApiDocument();

const shareId = "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f71";

const everyRole = ["admin", "member", "guest", "anonymous"];

const readCodes = [
  "access_ended",
  "internal_error",
  "invalid_request",
  "not_found",
  "unauthenticated",
].sort();

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
  it("is declared for every signed-in role, with not_found", () => {
    const { route, meta, errorMap } = getShare["~orpc"];
    expect(route).toMatchObject({ method: "GET", path: "/shares/{id}" });
    expect(meta.roles).toEqual(everyRole);
    expect(Object.keys(errorMap).sort()).toEqual(readCodes);
  });

  it("takes the share's id and the period", () => {
    const input = getShare["~orpc"].inputSchema;
    expect(input?.safeParse({ id: shareId, period: "3M" }).success).toBe(true);
    expect(input?.safeParse({ id: "42", period: "3M" }).success).toBe(false);
    expect(input?.safeParse({ id: shareId }).success).toBe(false);
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

  it("is in the OpenAPI document with the position marked", () => {
    const operation = document.paths?.["/shares/{id}"]?.get;
    expect(operation).toMatchObject({ "x-roles": everyRole });
    expect(operation?.responses?.["200"]).toMatchObject({
      content: {
        "application/json": {
          schema: {
            properties: {
              position: {
                anyOf: [
                  {
                    properties: {
                      quantity: { "x-anonymize": "quantity" },
                      valueEur: { "x-anonymize": "euro" },
                      gain: {
                        anyOf: [
                          {
                            properties: {
                              eur: { "x-anonymize": "euro" },
                              percent: {},
                            },
                          },
                          { type: "null" },
                        ],
                      },
                    },
                  },
                  { type: "null" },
                ],
              },
            },
          },
        },
      },
    });
  });
});

describe("GET /shares/{id}/prices", () => {
  it("is declared for every signed-in role, with not_found", () => {
    const { route, meta, errorMap } = getSharePrices["~orpc"];
    expect(route).toMatchObject({ method: "GET", path: "/shares/{id}/prices" });
    expect(meta.roles).toEqual(everyRole);
    expect(Object.keys(errorMap).sort()).toEqual(readCodes);
  });

  it("takes a range among the periods", () => {
    const input = getSharePrices["~orpc"].inputSchema;
    expect(input?.safeParse({ id: shareId, range: "1D" }).success).toBe(true);
    expect(input?.safeParse({ id: shareId, range: "5Y" }).success).toBe(false);
  });

  it("accepts chart points, none for a share nobody held, and keeps them unmarked", () => {
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
    expect(
      anonymizeKind(sharePricesSchema.shape.points.element.shape.priceEur),
    ).toBeUndefined();
  });
});

describe("GET /shares/{id}/holders", () => {
  it("is declared for every signed-in role, with not_found", () => {
    const { route, meta, errorMap } = getShareHolders["~orpc"];
    expect(route).toMatchObject({
      method: "GET",
      path: "/shares/{id}/holders",
    });
    expect(meta.roles).toEqual(everyRole);
    expect(Object.keys(errorMap).sort()).toEqual(readCodes);
  });

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

  it("marks the holder's name and picture, quantities, and euro amounts", () => {
    const { shape } = shareHolderSchema;
    expect(anonymizeKind(shape.person.shape.displayName)).toBe("personal");
    expect(anonymizeKind(shape.person.shape.avatarUrl)).toBe("personal");
    expect(anonymizeKind(shape.quantity)).toBe("quantity");
    expect(anonymizeKind(shape.valueEur)).toBe("euro");
    expect(anonymizeKind(shape.weight)).toBeUndefined();
    expect(shape.gain.unwrap()).toBe(gainSchema);
    expect(anonymizeKind(shareHolderChangeSchema.shape.quantityDelta)).toBe(
      "quantity",
    );
  });
});

describe("DELETE /shares/{id}", () => {
  it("is declared for the admin only, with share_in_use", () => {
    const { route, meta, errorMap } = deleteShare["~orpc"];
    expect(route).toMatchObject({
      method: "DELETE",
      path: "/shares/{id}",
      successStatus: 204,
    });
    expect(meta.roles).toEqual(["admin"]);
    expect(Object.keys(errorMap).sort()).toEqual(
      [
        "access_ended",
        "forbidden",
        "internal_error",
        "invalid_request",
        "not_found",
        "share_in_use",
        "unauthenticated",
      ].sort(),
    );
  });

  it("takes the share's id", () => {
    const input = deleteShare["~orpc"].inputSchema;
    expect(input?.safeParse({ id: shareId }).success).toBe(true);
    expect(input?.safeParse({ id: "EXF.PA" }).success).toBe(false);
  });

  it("is in the OpenAPI document for the admin, with 204 and 409", () => {
    const operation = document.paths?.["/shares/{id}"]?.delete;
    expect(operation).toMatchObject({ "x-roles": ["admin"] });
    expect(Object.keys(operation?.responses ?? {}).sort()).toEqual(
      ["204", "400", "401", "403", "404", "409", "500"].sort(),
    );
    expect(operation?.responses?.["409"]).toMatchObject({
      description: "`share_in_use`",
    });
  });
});
