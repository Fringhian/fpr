import { decimalPattern } from "@fpr/contracts";
import { describe, expect, it } from "vitest";
import { divideDecimal, shiftDecimal } from "./decimal.js";

describe("divideDecimal", () => {
  it.each([
    ["10", "4", 6, "2.5"],
    ["10", "3", 2, "3.33"],
    ["20", "3", 2, "6.67"],
    ["1.005", "1", 2, "1.01"],
    ["1.004999", "1", 2, "1"],
    ["-10", "3", 2, "-3.33"],
    ["-20", "3", 2, "-6.67"],
    ["0.001", "3", 2, "0"],
    ["-0.001", "3", 2, "0"],
    ["74.3280", "1.0823", 6, "68.675968"],
    ["0.1", "0.2", 6, "0.5"],
    ["100", "0.83545", 6, "119.695972"],
    [
      "123456789012345678901234567890",
      "1",
      0,
      "123456789012345678901234567890",
    ],
  ])("%s / %s at scale %i is %s", (dividend, divisor, scale, quotient) => {
    expect(divideDecimal(dividend, divisor, scale)).toBe(quotient);
  });

  it("is exact where a float is not", () => {
    // 0.3 / 0.1 is 2.9999999999999996 as a float.
    expect(divideDecimal("0.3", "0.1", 20)).toBe("3");
  });

  it("returns decimal strings", () => {
    for (const quotient of [
      divideDecimal("2", "3", 10),
      divideDecimal("-1", "8", 2),
      divideDecimal("0", "7", 4),
    ]) {
      expect(quotient).toMatch(decimalPattern);
    }
  });

  it("refuses a divisor of zero", () => {
    expect(() => divideDecimal("1", "0.000", 2)).toThrow(RangeError);
  });

  it("refuses a value that is not a decimal string", () => {
    expect(() => divideDecimal("1e3", "1", 2)).toThrow(RangeError);
    expect(() => divideDecimal("1", "", 2)).toThrow(RangeError);
  });

  it("refuses a negative or fractional scale", () => {
    expect(() => divideDecimal("1", "1", -1)).toThrow(RangeError);
    expect(() => divideDecimal("1", "1", 1.5)).toThrow(RangeError);
  });
});

describe("shiftDecimal", () => {
  it.each([
    ["1234.5", 2, "12.345"],
    ["5", 2, "0.05"],
    ["1250", 2, "12.5"],
    ["-7", 1, "-0.7"],
    ["0", 2, "0"],
    ["3.10", 0, "3.1"],
  ])("%s shifted by %i is %s", (value, places, shifted) => {
    expect(shiftDecimal(value, places)).toBe(shifted);
  });
});
