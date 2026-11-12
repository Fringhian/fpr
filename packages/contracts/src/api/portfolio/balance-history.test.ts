import { describe, expect, it } from "vitest";
import { memberSeriesPointSchema } from "../../schemas/performance.js";
import {
  type PortfolioBalanceHistory,
  portfolioBalanceHistoryQuerySchema,
  portfolioBalanceHistorySchema,
} from "./balance-history.js";

const userId = "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70";

const history: PortfolioBalanceHistory = {
  points: [
    {
      at: "2026-03-02T23:59:59+01:00",
      balanceEur: "1001.67",
      gain: { eur: "0", percent: "0" },
      provisional: false,
      incomplete: false,
    },
    {
      at: "2026-03-03T10:30:00+01:00",
      balanceEur: "1012.40",
      gain: { eur: "10.73", percent: "1.07" },
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
  it("takes the member and a period, and refuses anything else", () => {
    const query = portfolioBalanceHistoryQuerySchema;
    expect(query.safeParse({ userId, period: "YTD" }).success).toBe(true);
    expect(query.safeParse({ userId, period: "ytd" }).success).toBe(false);
    expect(query.safeParse({ period: "YTD" }).success).toBe(false);
  });

  it("accepts closes, provisional points, and the entries to mark", () => {
    expect(portfolioBalanceHistorySchema.parse(history)).toEqual(history);
    expect(
      portfolioBalanceHistorySchema.safeParse({ points: [], entries: [] })
        .success,
    ).toBe(true);
  });

  it("refuses a balance as a number, a point without its gain, or without its markers", () => {
    const [point] = history.points;
    expect(
      memberSeriesPointSchema.safeParse({ ...point, balanceEur: 1001.67 })
        .success,
    ).toBe(false);
    const { gain: _, ...withoutGain } = point ?? {};
    expect(memberSeriesPointSchema.safeParse(withoutGain).success).toBe(false);
    const { provisional: __, ...withoutMarker } = point ?? {};
    expect(memberSeriesPointSchema.safeParse(withoutMarker).success).toBe(
      false,
    );
  });
});
