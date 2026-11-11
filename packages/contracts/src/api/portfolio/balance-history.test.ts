import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../../anonymize.js";
import { createOpenApiDocument } from "../../openapi.js";
import {
  getPortfolioBalanceHistory,
  type PortfolioBalanceHistory,
  portfolioBalanceHistorySchema,
  portfolioBalancePointSchema,
} from "./balance-history.js";

const userId = "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70";

const history: PortfolioBalanceHistory = {
  points: [
    {
      at: "2026-03-02T23:59:59+01:00",
      balanceEur: "1001.67",
      provisional: false,
      incomplete: false,
    },
    {
      at: "2026-03-03T10:30:00+01:00",
      balanceEur: "1012.40",
      provisional: true,
      incomplete: true,
    },
  ],
  entries: [
    {
      type: "cash",
      id: "4f5a6b7c-8d9e-4f0a-9b1c-2d3e4f5a6b7c",
      amountEur: "80.00",
      effectiveAt: "2026-03-02T12:00:00+01:00",
    },
  ],
};

describe("GET /users/{userId}/balance-history", () => {
  it("is declared for every signed-in role, with its codes", () => {
    const { route, meta, errorMap } = getPortfolioBalanceHistory["~orpc"];
    expect(route).toMatchObject({
      method: "GET",
      path: "/users/{userId}/balance-history",
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
    const input = getPortfolioBalanceHistory["~orpc"].inputSchema;
    expect(input?.safeParse({ userId, period: "YTD" }).success).toBe(true);
    expect(input?.safeParse({ userId, period: "ytd" }).success).toBe(false);
    expect(input?.safeParse({ period: "YTD" }).success).toBe(false);
  });

  it("accepts closes, provisional points, and the entries to mark", () => {
    expect(portfolioBalanceHistorySchema.parse(history)).toEqual(history);
    expect(
      portfolioBalanceHistorySchema.safeParse({ points: [], entries: [] })
        .success,
    ).toBe(true);
  });

  it("refuses a balance as a number or a point without its markers", () => {
    const [point] = history.points;
    expect(
      portfolioBalancePointSchema.safeParse({ ...point, balanceEur: 1001.67 })
        .success,
    ).toBe(false);
    const { provisional: _, ...withoutMarker } = point ?? {};
    expect(portfolioBalancePointSchema.safeParse(withoutMarker).success).toBe(
      false,
    );
  });

  it("marks the series and each balance euro", () => {
    expect(anonymizeKind(portfolioBalanceHistorySchema.shape.points)).toBe(
      "euro",
    );
    expect(anonymizeKind(portfolioBalancePointSchema.shape.balanceEur)).toBe(
      "euro",
    );
  });

  it("is in the OpenAPI document, with its roles and markers", async () => {
    const operation = (await createOpenApiDocument()).paths?.[
      "/users/{userId}/balance-history"
    ]?.get;

    expect(operation).toMatchObject({
      operationId: "portfolio.balanceHistory",
      "x-roles": ["admin", "member", "guest", "anonymous"],
      responses: {
        "200": {
          content: {
            "application/json": {
              schema: {
                properties: {
                  points: {
                    "x-anonymize": "euro",
                    items: {
                      properties: { balanceEur: { "x-anonymize": "euro" } },
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
