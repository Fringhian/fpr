import { describe, expect, it } from "vitest";
import {
  type PortfolioLog,
  portfolioLogEntrySchema,
  portfolioLogQuerySchema,
  portfolioLogSchema,
} from "./log.js";

const userId = "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70";

const page: PortfolioLog = {
  entries: [
    {
      type: "cash",
      id: "4f5a6b7c-8d9e-4f0a-9b1c-2d3e4f5a6b7c",
      amountEur: "80.00",
      effectiveAt: "2026-03-05T12:00:00+01:00",
    },
    {
      type: "change",
      id: "3e4f5a6b-7c8d-4e9f-8a1b-2c3d4e5f6a7b",
      share: {
        id: "1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f",
        isin: "FR0000000001",
        name: "Example Fund",
        kind: "manual",
        symbol: null,
      },
      quantityDelta: "74.328",
      effectiveAt: "2026-03-02T12:00:00+01:00",
    },
  ],
  nextBefore: "opaque-cursor",
};

describe("GET /users/{userId}/log", () => {
  const input = portfolioLogQuerySchema;

  it("reads the limit from the query string, 50 by default", () => {
    expect(input.parse({ userId })).toEqual({ userId, limit: 50 });
    expect(input.parse({ userId, limit: "20", before: "abc" })).toEqual({
      userId,
      limit: 20,
      before: "abc",
    });
  });

  it.each([
    ["a limit of zero", { limit: "0" }],
    ["a limit over 100", { limit: "101" }],
    ["a limit with decimals", { limit: "2.5" }],
    ["a limit that isn't a number", { limit: "all" }],
    ["an empty cursor", { before: "" }],
  ])("refuses %s", (_, query) => {
    expect(input.safeParse({ userId, ...query }).success).toBe(false);
  });

  it("accepts a page of changes and cash balances, and the last page", () => {
    expect(portfolioLogSchema.parse(page)).toEqual(page);
    expect(
      portfolioLogSchema.safeParse({ entries: [], nextBefore: null }).success,
    ).toBe(true);
  });

  it("tells entries apart by type", () => {
    const [cash, change] = page.entries;
    expect(
      portfolioLogEntrySchema.safeParse({ ...cash, type: "change" }).success,
    ).toBe(false);
    expect(
      portfolioLogEntrySchema.safeParse({ ...change, type: "dividend" })
        .success,
    ).toBe(false);
  });
});
