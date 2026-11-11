import pg from "pg";
import { describe, expect, it } from "vitest";
import { typeParsers } from "./type-parsers.js";

const { builtins } = pg.types;
const parse = (oid: number, value: string): unknown =>
  typeParsers.getTypeParser(oid, "text")(value);

describe("typeParsers", () => {
  it("reads numeric as a decimal string, keeping every digit", () => {
    expect(parse(builtins.NUMERIC, "12345678901234567890.123456")).toBe(
      "12345678901234567890.123456",
    );
    expect(parse(builtins.NUMERIC, "-0.10")).toBe("-0.10");
  });

  it("reads timestamptz as a Date at the right instant", () => {
    const value = parse(builtins.TIMESTAMPTZ, "2026-03-03 23:59:59+01");
    expect(value).toBeInstanceOf(Date);
    expect((value as Date).toISOString()).toBe("2026-03-03T22:59:59.000Z");
  });

  it("reads date as a YYYY-MM-DD string", () => {
    expect(parse(builtins.DATE, "2026-03-03")).toBe("2026-03-03");
  });

  it("keeps pg's default parser for other types", () => {
    expect(parse(builtins.INT4, "42")).toBe(42);
    expect(parse(builtins.BOOL, "t")).toBe(true);
    expect(parse(builtins.TEXT, "Fund X")).toBe("Fund X");
  });

  it("leaves pg's global parsers untouched", () => {
    expect(
      pg.types.getTypeParser(builtins.DATE, "text")("2026-03-03"),
    ).toBeInstanceOf(Date);
  });
});
