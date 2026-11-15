import { describe, expect, it } from "vitest";
import { gainDisplay } from "./gain";

describe("gainDisplay", () => {
  const gain = { eur: "512.40", percent: "4.2" };

  it("writes the unit asked for, signed", () => {
    expect(gainDisplay(gain, "percent", "en")).toEqual({
      text: "+4.2%",
      tone: "positive",
      unit: "percent",
    });
    expect(gainDisplay(gain, "eur", "en")).toEqual({
      text: "+€512.40",
      tone: "positive",
      unit: "eur",
    });
  });

  it("rounds euros to whole euros on request", () => {
    expect(gainDisplay(gain, "eur", "en", { precision: "euros" })?.text).toBe(
      "+€512",
    );
  });

  it("reads a loss as negative, with the minus sign", () => {
    expect(
      gainDisplay({ eur: "-18.30", percent: "-1.3" }, "percent", "fr"),
    ).toEqual({ text: "−1,3 %", tone: "negative", unit: "percent" });
  });

  it("reads a value that rounds to zero as flat, with no sign", () => {
    expect(
      gainDisplay({ eur: "0.001", percent: "-0.04" }, "percent", "en"),
    ).toEqual({ text: "0.0%", tone: "flat", unit: "percent" });
    expect(gainDisplay({ eur: "0.001", percent: null }, "eur", "en")).toEqual({
      text: "€0.00",
      tone: "flat",
      unit: "eur",
    });
  });

  it("reads in percent for an anonymous viewer, who has no euros", () => {
    expect(gainDisplay({ percent: "4.2" }, "eur", "en")).toEqual({
      text: "+4.2%",
      tone: "positive",
      unit: "percent",
    });
    expect(gainDisplay({ eur: null, percent: "4.2" }, "eur", "en")?.unit).toBe(
      "percent",
    );
  });

  it("reads in euros from a start at zero, which has no percentage", () => {
    expect(gainDisplay({ eur: "120", percent: null }, "percent", "en")).toEqual(
      { text: "+€120.00", tone: "positive", unit: "eur" },
    );
  });

  it("is null with neither euros nor a percentage", () => {
    expect(gainDisplay({ percent: null }, "percent", "en")).toBeNull();
  });
});
