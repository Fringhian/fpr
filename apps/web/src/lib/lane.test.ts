import { describe, expect, it } from "vitest";
import { type LaneValue, laneAmount, laneBar, laneScale } from "./lane";

const gain = (eur: string | undefined, percent: string | null): LaneValue => ({
  board: "gain",
  gain: eur === undefined ? { percent } : { eur, percent },
  unit: "eur",
});

describe("laneAmount", () => {
  it("reads the gain in the unit asked for", () => {
    expect(laneAmount(gain("512.40", "4.2"))).toBe(512.4);
    expect(
      laneAmount({
        board: "gain",
        gain: { eur: "512.40", percent: "4.2" },
        unit: "percent",
      }),
    ).toBe(4.2);
  });

  it("reads percent when there are no euros, as for an anonymous viewer", () => {
    expect(laneAmount(gain(undefined, "-1.3"))).toBe(-1.3);
  });

  it("draws nothing without a value", () => {
    expect(laneAmount(gain(undefined, null))).toBeNull();
    expect(laneAmount({ board: "balance", balance: null })).toBeNull();
  });

  it("reads a balance in euros", () => {
    expect(laneAmount({ board: "balance", balance: "12374" })).toBe(12374);
  });
});

describe("laneScale", () => {
  it("spans the lowest and highest values, zero included", () => {
    expect(
      laneScale([gain("610", "6.1"), gain("-270", "-2.7"), gain("42", "0.4")]),
    ).toEqual({ min: -270, max: 610 });
    expect(laneScale([gain("610", "6.1"), gain("42", "0.4")])).toEqual({
      min: 0,
      max: 610,
    });
  });

  it("skips lanes with nothing to draw", () => {
    expect(laneScale([gain(undefined, null)])).toEqual({ min: 0, max: 0 });
  });
});

describe("laneBar", () => {
  const scale = { min: -2, max: 6 };

  it("puts the zero line where the largest loss fits", () => {
    expect(laneBar(4, scale)).toEqual({ zero: 25, start: 25, width: 50 });
  });

  it("draws a loss leftwards from the zero line", () => {
    expect(laneBar(-2, scale)).toEqual({ zero: 25, start: 0, width: 25 });
  });

  it("gives the largest value the whole span right of zero", () => {
    expect(laneBar(6, { min: 0, max: 6 })).toEqual({
      zero: 0,
      start: 0,
      width: 100,
    });
  });

  it("draws no bar at zero, without a value, or on an empty scale", () => {
    expect(laneBar(0, scale).width).toBe(0);
    expect(laneBar(null, scale)).toEqual({ zero: 25, start: 25, width: 0 });
    expect(laneBar(3, { min: 0, max: 0 })).toEqual({
      zero: 0,
      start: 0,
      width: 0,
    });
  });

  it("keeps a value beyond the scale inside the track", () => {
    expect(laneBar(12, scale)).toEqual({ zero: 25, start: 25, width: 75 });
  });
});
