import { describe, expect, it } from "vitest";
import { anonymizeKind } from "../anonymize.js";
import {
  type Gain,
  gainSchema,
  incompleteSchema,
  measuredFromSchema,
  memberSeriesPointSchema,
  type Position,
  positionSchema,
  priceChangeSchema,
} from "./performance.js";

const gain: Gain = { eur: "-18.30", percent: "-1.95" };

describe("gainSchema", () => {
  it("accepts euros and percent, and no percent from a start at zero", () => {
    expect(gainSchema.parse(gain)).toEqual(gain);
    expect(gainSchema.safeParse({ eur: "30", percent: null }).success).toBe(
      true,
    );
  });

  it("refuses a gain without either, or with numbers", () => {
    expect(gainSchema.safeParse({ eur: "30" }).success).toBe(false);
    expect(gainSchema.safeParse({ percent: "1" }).success).toBe(false);
    expect(gainSchema.safeParse({ eur: 30, percent: "1" }).success).toBe(false);
  });

  it("marks the euros and keeps the percent beside them", () => {
    expect(anonymizeKind(gainSchema.shape.eur)).toBe("euro");
    expect(anonymizeKind(gainSchema.shape.percent)).toBeUndefined();
  });
});

describe("positionSchema", () => {
  const position: Position = {
    quantity: "74.328",
    valueEur: "921.67",
    weight: "92.1",
    gain,
  };

  it("accepts a position, and one with no price yet", () => {
    expect(positionSchema.parse(position)).toEqual(position);
    expect(
      positionSchema.safeParse({
        quantity: "3",
        valueEur: null,
        weight: null,
        gain: null,
      }).success,
    ).toBe(true);
  });

  it("marks the quantity and value, and keeps the weight beside them", () => {
    const { shape } = positionSchema;
    expect(anonymizeKind(shape.quantity)).toBe("quantity");
    expect(anonymizeKind(shape.valueEur)).toBe("euro");
    expect(anonymizeKind(shape.weight)).toBeUndefined();
    expect(shape.gain.unwrap()).toBe(gainSchema);
  });
});

describe("priceChangeSchema", () => {
  it("accepts a change in euros and percent, both unmarked as market data", () => {
    const change = { eur: "-0.90", percent: "-2.2" };
    expect(priceChangeSchema.parse(change)).toEqual(change);
    expect(priceChangeSchema.safeParse({ eur: "-0.90" }).success).toBe(false);
    expect(anonymizeKind(priceChangeSchema.shape.eur)).toBeUndefined();
    expect(anonymizeKind(priceChangeSchema.shape.percent)).toBeUndefined();
  });
});

describe("memberSeriesPointSchema", () => {
  const point = {
    at: "2026-03-02T23:59:59+01:00",
    balanceEur: "1001.67",
    gain,
    provisional: false,
    incomplete: false,
  };

  it("accepts a close or a refresh, with its balance and gain", () => {
    expect(memberSeriesPointSchema.parse(point)).toEqual(point);
    expect(
      memberSeriesPointSchema.safeParse({ ...point, provisional: true })
        .success,
    ).toBe(true);
  });

  it("refuses a day without its time, or a point without its gain", () => {
    expect(
      memberSeriesPointSchema.safeParse({ ...point, at: "2026-03-02" }).success,
    ).toBe(false);
    const { gain: _, ...withoutGain } = point;
    expect(memberSeriesPointSchema.safeParse(withoutGain).success).toBe(false);
  });

  it("marks the balance, which has no percentage, and the euro gain", () => {
    expect(anonymizeKind(memberSeriesPointSchema.shape.balanceEur)).toBe(
      "euro",
    );
    expect(memberSeriesPointSchema.shape.gain).toBe(gainSchema);
    expect(memberSeriesPointSchema.shape.incomplete).toBe(incompleteSchema);
  });
});

describe("measuredFromSchema", () => {
  it("is a day, or null when the history covers the period", () => {
    expect(measuredFromSchema.safeParse("2026-02-12").success).toBe(true);
    expect(measuredFromSchema.safeParse(null).success).toBe(true);
    expect(
      measuredFromSchema.safeParse("2026-02-12T12:00:00+01:00").success,
    ).toBe(false);
  });
});
