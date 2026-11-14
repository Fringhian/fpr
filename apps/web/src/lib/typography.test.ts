import { describe, expect, it } from "vitest";
import { quote } from "./typography";

const NNBSP = String.fromCodePoint(0x202f);

describe("quote", () => {
  it("uses curly quotes in English", () => {
    expect(quote("World Index ETF", "en")).toBe("“World Index ETF”");
  });

  it("uses « » with narrow no-break spaces inside in French", () => {
    expect(quote("World Index ETF", "fr")).toBe(
      `«${NNBSP}World Index ETF${NNBSP}»`,
    );
  });
});
