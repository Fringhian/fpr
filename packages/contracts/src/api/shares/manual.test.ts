import { describe, expect, it } from "vitest";
import {
  type ShareManualBody,
  shareManualBodySchema,
  updateShare,
} from "./manual.js";

const shareId = "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f71";

const body: ShareManualBody = {
  isin: "XS000EXMPL31",
  name: "Example Certificate",
  priceEur: "40.10",
  at: "2026-03-02T05:10:00+01:00",
};

describe("POST /shares/manual", () => {
  it("accepts an ISIN, a name, and a first value, trimming the name", () => {
    expect(
      shareManualBodySchema.parse({ ...body, name: " Example Certificate " }),
    ).toEqual(body);
  });

  it.each([
    ["an invalid ISIN", { isin: "XS000EXMPL3" }],
    ["an empty name", { name: "  " }],
    ["a value of zero", { priceEur: "0.00" }],
    ["a value below zero", { priceEur: "-40.10" }],
    ["a value as a number", { priceEur: 40.1 }],
    ["a day without its time", { at: "2026-03-02" }],
  ])("refuses %s", (_, change) => {
    expect(
      shareManualBodySchema.safeParse({ ...body, ...change }).success,
    ).toBe(false);
  });
});

describe("PATCH /shares/{id}", () => {
  const input = updateShare["~orpc"].inputSchema;

  it("accepts a new name, a new ISIN, or both", () => {
    expect(
      input?.safeParse({ id: shareId, name: "Example Note" }).success,
    ).toBe(true);
    expect(
      input?.safeParse({ id: shareId, isin: "FR000EXMPL06" }).success,
    ).toBe(true);
    expect(
      input?.safeParse({ id: shareId, name: "Example Note", isin: body.isin })
        .success,
    ).toBe(true);
  });

  it("refuses an edit with neither, or an invalid ISIN", () => {
    expect(input?.safeParse({ id: shareId }).success).toBe(false);
    expect(input?.safeParse({ id: shareId, isin: "FR0" }).success).toBe(false);
    expect(input?.safeParse({ id: shareId, name: "" }).success).toBe(false);
  });

  it("refuses a name over 100 characters", () => {
    expect(
      input?.safeParse({ id: shareId, name: "x".repeat(101) }).success,
    ).toBe(false);
  });
});
