import { describe, expect, expectTypeOf, it } from "vitest";
import { type Decimal, decimalSchema } from "./decimal.js";

describe("decimalSchema", () => {
  it.each([
    "0",
    "7",
    "42",
    "-3",
    "0.5",
    "-0.5",
    "74.328",
    "1.50",
    "0.000001",
    "-1250.00",
    "123456789012345678901234567890.123456789012345678",
  ])("accepts %j", (input) => {
    expect(decimalSchema.safeParse(input)).toEqual({
      success: true,
      data: input,
    });
  });

  it.each([
    ["an empty string", ""],
    ["a leading space", " 1"],
    ["a trailing space", "1 "],
    ["a plus sign", "+1"],
    ["a leading zero", "01"],
    ["a negative leading zero", "-01"],
    ["a trailing point", "1."],
    ["a leading point", ".5"],
    ["an exponent", "1e3"],
    ["an uppercase exponent", "1E3"],
    ["a decimal comma", "1,5"],
    ["a thousands separator", "1 000"],
    ["an underscore separator", "1_000"],
    ["negative zero", "-0"],
    ["negative zero with decimals", "-0.00"],
    ["a double minus", "--1"],
    ["two points", "1.2.3"],
    ["NaN", "NaN"],
    ["Infinity", "Infinity"],
    ["a hexadecimal", "0x10"],
    ["a unit", "12 EUR"],
  ])("refuses %s", (_, input) => {
    expect(decimalSchema.safeParse(input).success).toBe(false);
  });

  it.each([
    ["an integer number", 1],
    ["a fractional number", 74.328],
    ["a bigint", 1n],
    ["null", null],
    ["undefined", undefined],
  ])("refuses %s, which is not a string", (_, input) => {
    expect(decimalSchema.safeParse(input).success).toBe(false);
  });

  it("types a decimal as a string", () => {
    expectTypeOf<Decimal>().toEqualTypeOf<string>();
  });
});
