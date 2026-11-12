import { describe, expect, it } from "vitest";
import {
  type PortfolioCashBalance,
  portfolioCashBalanceSchema,
  portfolioCashInputSchema,
  portfolioCashUpdateSchema,
} from "./cash.js";

const userId = "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70";
const id = "4f5a6b7c-8d9e-4f0a-9b1c-2d3e4f5a6b7c";

const balance: PortfolioCashBalance = {
  type: "cash",
  id,
  amountEur: "1250.00",
  effectiveAt: "2026-03-02T12:00:00+01:00",
};

describe("POST /users/{userId}/cash-balances", () => {
  const input = portfolioCashInputSchema;
  const body = {
    userId,
    amountEur: "30",
    effectiveAt: "2026-03-02T12:00:00+01:00",
  };

  it("accepts an amount of zero or more", () => {
    expect(input.parse(body)).toEqual(body);
    expect(input.safeParse({ ...body, amountEur: "0" }).success).toBe(true);
  });

  it.each([
    ["a negative amount", { amountEur: "-5" }],
    ["a number", { amountEur: 30 }],
    ["an exponent", { amountEur: "3e1" }],
    ["a moment without offset", { effectiveAt: "2026-03-02T12:00:00" }],
    ["a missing amount", { amountEur: undefined }],
  ])("refuses %s", (_, cash) => {
    expect(input.safeParse({ ...body, ...cash }).success).toBe(false);
  });

  it("takes an optional client-generated id, a UUID, against double saves", () => {
    expect(input.parse({ ...body, id })).toEqual({ ...body, id });
    expect(input.safeParse({ ...body, id: "save-1" }).success).toBe(false);
  });
});

describe("PATCH /cash-balances/{id}", () => {
  const input = portfolioCashUpdateSchema;

  it("accepts a new amount, a new moment, or both", () => {
    expect(input.safeParse({ id, amountEur: "40.10" }).success).toBe(true);
    expect(
      input.safeParse({ id, effectiveAt: "2026-03-01T12:00:00Z" }).success,
    ).toBe(true);
  });

  it("refuses an empty edit and a negative amount", () => {
    expect(input.safeParse({ id }).success).toBe(false);
    expect(input.safeParse({ id, amountEur: "-1" }).success).toBe(false);
  });
});

describe("portfolioCashBalanceSchema", () => {
  it("accepts a balance and refuses a negative one", () => {
    expect(portfolioCashBalanceSchema.parse(balance)).toEqual(balance);
    expect(
      portfolioCashBalanceSchema.safeParse({ ...balance, amountEur: "-1" })
        .success,
    ).toBe(false);
  });
});
