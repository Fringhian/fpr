import { describe, expect, it } from "vitest";
import { moverBar, moverScale } from "./mover";

const pharma = { eur: "620.00", percent: "12.4" };
const index = { eur: "180.00", percent: "2.4" };
const bank = { eur: "-40.00", percent: "-1.0" };

describe("moverScale", () => {
  it("spans the lowest and highest gain in each unit, with zero inside", () => {
    expect(moverScale([pharma, index, bank], "eur")).toEqual({
      eur: { low: -40, high: 620 },
      percent: { low: 0, high: 0 },
    });
    expect(moverScale([pharma, index], "percent")).toEqual({
      eur: { low: 0, high: 0 },
      percent: { low: 0, high: 12.4 },
    });
  });

  it("scales a gain in the unit it reads in", () => {
    // Bought during the period: no percentage, so it reads in euros.
    const bought = { eur: "75.00", percent: null };
    // An anonymous viewer's gain: no euros, so it reads in percent.
    const anonymous = { percent: "-3.5" };
    expect(moverScale([bought, anonymous, pharma], "percent")).toEqual({
      eur: { low: 0, high: 75 },
      percent: { low: -3.5, high: 12.4 },
    });
  });

  it("leaves out a gain with no value", () => {
    expect(moverScale([{ eur: null, percent: null }], "eur")).toEqual({
      eur: { low: 0, high: 0 },
      percent: { low: 0, high: 0 },
    });
  });
});

describe("moverBar", () => {
  const scale = moverScale([pharma, index, bank], "percent");

  it("puts the zero line where the lowest loss ends", () => {
    expect(moverBar(pharma, "percent", scale)?.zero).toBeCloseTo(1 / 13.4);
  });

  it("draws the biggest mover across the rest of the track", () => {
    const bar = moverBar(pharma, "percent", scale);
    expect(bar?.direction).toBe("gain");
    expect(bar?.length).toBeCloseTo(12.4 / 13.4);
  });

  it("draws a loss to the left of the zero line", () => {
    const bar = moverBar(bank, "percent", scale);
    expect(bar?.direction).toBe("loss");
    expect(bar?.length).toBeCloseTo(1 / 13.4);
  });

  it("starts at zero with no bar when every mover is at zero", () => {
    const flat = { eur: "0.00", percent: "0.0" };
    expect(moverBar(flat, "eur", moverScale([flat], "eur"))).toEqual({
      zero: 0,
      length: 0,
      direction: "gain",
    });
  });

  it("is null for a gain with no value", () => {
    expect(moverBar({ percent: null }, "eur", scale)).toBeNull();
  });
});
