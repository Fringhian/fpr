import { describe, expect, it } from "vitest";
import { adminRefreshPrices, adminRefreshResultSchema } from "./prices.js";

describe("adminRefreshResultSchema", () => {
  const result = { sharesPriced: 12, finishedAt: "2026-03-02T17:30:00+01:00" };

  it("accepts a finished refresh, and refuses a negative or fractional count", () => {
    expect(adminRefreshResultSchema.parse(result)).toEqual(result);
    expect(
      adminRefreshResultSchema.safeParse({ ...result, sharesPriced: -1 })
        .success,
    ).toBe(false);
    expect(
      adminRefreshResultSchema.safeParse({ ...result, sharesPriced: 1.5 })
        .success,
    ).toBe(false);
  });
});

describe("POST /admin/prices/refresh", () => {
  it("takes no input", () => {
    expect(adminRefreshPrices["~orpc"].inputSchema).toBeUndefined();
  });
});
