import { describe, expect, it } from "vitest";
import {
  pricesCreateManualBodySchema,
  pricesCreateMarketBodySchema,
  pricesDeleteShareInputSchema,
  pricesFillHistoryInputSchema,
  pricesLookupBodySchema,
  pricesMakeManualInputSchema,
  pricesUpdateShareInputSchema,
} from "./shares.js";

const shareId = "0b6f3c1e-8a2d-4c7e-9f10-2b3c4d5e6f70";
const memberId = "1c7a4d2f-9b3e-4d8f-8a21-3c4d5e6f7081";

describe("POST /lookup", () => {
  it("trims the query, and refuses an empty one", () => {
    expect(pricesLookupBodySchema.parse({ query: " QZ0EXAMPLE16 " })).toEqual({
      query: "QZ0EXAMPLE16",
    });
    expect(pricesLookupBodySchema.safeParse({ query: " " }).success).toBe(
      false,
    );
    expect(pricesLookupBodySchema.safeParse({}).success).toBe(false);
  });
});

describe("POST /shares/market", () => {
  it("takes the listing's symbol and the ISIN the member typed", () => {
    const body = { symbol: "EXT.US", isin: "QZ0EXAMPLE24" };
    expect(pricesCreateMarketBodySchema.parse(body)).toEqual(body);
    expect(
      pricesCreateMarketBodySchema.safeParse({ ...body, isin: "qz0example24" })
        .success,
    ).toBe(false);
    expect(
      pricesCreateMarketBodySchema.safeParse({ isin: body.isin }).success,
    ).toBe(false);
  });
});

describe("POST /shares/manual", () => {
  const body = {
    isin: "QZ0EXAMPLE32",
    name: "Example Certificate",
    priceEur: "40.10",
    at: "2026-03-02T05:10:00+01:00",
    createdBy: memberId,
  };

  it("accepts a share with its first value point", () => {
    expect(pricesCreateManualBodySchema.parse(body)).toEqual(body);
  });

  it.each([
    ["a price as a number", { priceEur: 40.1 }],
    ["a negative price", { priceEur: "-40.10" }],
    ["a moment without its offset", { at: "2026-03-02T05:10:00" }],
    ["an invalid ISIN", { isin: "QZ0EXAMPLE" }],
    ["an empty name", { name: "" }],
    ["no creator", { createdBy: undefined }],
    ["snake_case fields", { priceEur: undefined, price_eur: "40.10" }],
  ])("refuses %s", (_, change) => {
    expect(
      pricesCreateManualBodySchema.safeParse({ ...body, ...change }).success,
    ).toBe(false);
  });
});

describe("PATCH /shares/{id}", () => {
  it("accepts a name, an ISIN, or both", () => {
    for (const change of [
      { name: "Example Fund" },
      { isin: "QZ0EXAMPLE16" },
      { name: "Example Fund", isin: "QZ0EXAMPLE16" },
    ]) {
      expect(
        pricesUpdateShareInputSchema.safeParse({ id: shareId, ...change })
          .success,
      ).toBe(true);
    }
  });

  it("refuses neither, or an id that isn't a uuid", () => {
    expect(
      pricesUpdateShareInputSchema.safeParse({ id: shareId }).success,
    ).toBe(false);
    expect(
      pricesUpdateShareInputSchema.safeParse({ id: "42", name: "Example Fund" })
        .success,
    ).toBe(false);
  });
});

describe("POST /shares/{id}/history", () => {
  it("takes a day, not a moment", () => {
    expect(
      pricesFillHistoryInputSchema.safeParse({
        id: shareId,
        from: "2026-03-02",
      }).success,
    ).toBe(true);
    expect(
      pricesFillHistoryInputSchema.safeParse({
        id: shareId,
        from: "2026-03-02T05:10:00Z",
      }).success,
    ).toBe(false);
  });
});

describe("DELETE /shares/{id}", () => {
  it("takes the share's id", () => {
    expect(
      pricesDeleteShareInputSchema.safeParse({ id: shareId }).success,
    ).toBe(true);
    expect(pricesDeleteShareInputSchema.safeParse({}).success).toBe(false);
  });
});

describe("POST /shares/{id}/make-manual", () => {
  it("accepts a first value point, or none", () => {
    const input = { id: shareId, enteredBy: memberId };
    expect(pricesMakeManualInputSchema.safeParse(input).success).toBe(true);
    expect(
      pricesMakeManualInputSchema.safeParse({
        ...input,
        priceEur: "12.50",
        at: "2026-03-02T17:30:00+01:00",
      }).success,
    ).toBe(true);
  });

  it("refuses a price without its moment, or a moment without its price", () => {
    const input = { id: shareId, enteredBy: memberId };
    expect(
      pricesMakeManualInputSchema.safeParse({ ...input, priceEur: "12.50" })
        .success,
    ).toBe(false);
    expect(
      pricesMakeManualInputSchema.safeParse({
        ...input,
        at: "2026-03-02T17:30:00+01:00",
      }).success,
    ).toBe(false);
  });

  it("refuses a call without the admin who makes it", () => {
    expect(pricesMakeManualInputSchema.safeParse({ id: shareId }).success).toBe(
      false,
    );
  });
});
