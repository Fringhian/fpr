import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatGain,
  formatMoney,
  formatPercent,
  formatQuantity,
  formatTime,
} from "./format";

// The special characters, named so each assertion shows which is which.
const NNBSP = String.fromCodePoint(0x202f);
const MINUS = String.fromCodePoint(0x2212);

describe("formatMoney", () => {
  it("writes cents with the language's separators", () => {
    expect(formatMoney("1234.56", "en")).toBe("€1,234.56");
    expect(formatMoney("1234.56", "fr")).toBe(`1${NNBSP}234,56${NNBSP}€`);
  });

  it("pads to cents and rounds half away from zero, from the exact decimal", () => {
    expect(formatMoney("40.1", "en")).toBe("€40.10");
    expect(formatMoney("0.005", "en")).toBe("€0.01");
    expect(formatMoney("1234567.885", "fr")).toBe(
      `1${NNBSP}234${NNBSP}567,89${NNBSP}€`,
    );
  });

  it("rounds to whole euros", () => {
    expect(formatMoney("12374.40", "en", { precision: "euros" })).toBe(
      "€12,374",
    );
    expect(formatMoney("12374.50", "fr", { precision: "euros" })).toBe(
      `12${NNBSP}375${NNBSP}€`,
    );
  });

  it("writes a negative amount with a minus sign, and no sign on zero", () => {
    expect(formatMoney("-18.30", "en")).toBe(`${MINUS}€18.30`);
    expect(formatMoney("-18.30", "fr")).toBe(`${MINUS}18,30${NNBSP}€`);
    expect(formatMoney("-0.4", "en", { precision: "euros" })).toBe("€0");
  });

  it("signs every amount but zero when signed", () => {
    expect(formatMoney("512", "en", { signed: true })).toBe("+€512.00");
    expect(formatMoney("512", "fr", { signed: true })).toBe(`+512,00${NNBSP}€`);
    expect(formatMoney("-18.3", "en", { signed: true })).toBe(`${MINUS}€18.30`);
    expect(formatMoney("0", "fr", { signed: true })).toBe(`0,00${NNBSP}€`);
    expect(formatMoney("-0.001", "en", { signed: true })).toBe("€0.00");
  });

  it("refuses what isn't a decimal string", () => {
    for (const value of ["", "1,5", "1e3", "+1", " 1", "01", "-0", "abc"]) {
      expect(() => formatMoney(value, "en")).toThrow(RangeError);
    }
  });
});

describe("formatPercent", () => {
  it("writes one decimal, from a value in percent", () => {
    expect(formatPercent("16.2", "en")).toBe("16.2%");
    expect(formatPercent("16.2", "fr")).toBe(`16,2${NNBSP}%`);
    expect(formatPercent("100", "en")).toBe("100.0%");
    expect(formatPercent("1234.5", "fr")).toBe(`1${NNBSP}234,5${NNBSP}%`);
  });

  it("rounds to one decimal, never showing a negative zero", () => {
    expect(formatPercent("4.25", "en")).toBe("4.3%");
    expect(formatPercent("-0.04", "en")).toBe("0.0%");
    expect(formatPercent("-2.2", "fr")).toBe(`${MINUS}2,2${NNBSP}%`);
  });

  it("signs every percentage but zero when signed", () => {
    expect(formatPercent("4.2", "en", { signed: true })).toBe("+4.2%");
    expect(formatPercent("4.2", "fr", { signed: true })).toBe(`+4,2${NNBSP}%`);
    expect(formatPercent("-1.25", "en", { signed: true })).toBe(`${MINUS}1.3%`);
    expect(formatPercent("-1.25", "fr", { signed: true })).toBe(
      `${MINUS}1,3${NNBSP}%`,
    );
    expect(formatPercent("0.04", "en", { signed: true })).toBe("0.0%");
  });
});

describe("formatGain", () => {
  it("writes the euros, then the percentage", () => {
    const gain = { eur: "512.40", percent: "4.2" };
    expect(formatGain(gain, "en", { precision: "euros" })).toBe(
      "+€512 (+4.2%)",
    );
    expect(formatGain(gain, "fr", { precision: "euros" })).toBe(
      `+512${NNBSP}€ (+4,2${NNBSP}%)`,
    );
  });

  it("writes a loss with minus signs, in cents by default", () => {
    const loss = { eur: "-18.30", percent: "-1.95" };
    expect(formatGain(loss, "en")).toBe(`${MINUS}€18.30 (${MINUS}2.0%)`);
    expect(formatGain(loss, "fr")).toBe(
      `${MINUS}18,30${NNBSP}€ (${MINUS}2,0${NNBSP}%)`,
    );
  });

  it("writes the euros alone when the gain has no percentage", () => {
    expect(formatGain({ eur: "30", percent: null }, "en")).toBe("+€30.00");
    expect(formatGain({ eur: "30", percent: null }, "fr")).toBe(
      `+30,00${NNBSP}€`,
    );
  });
});

describe("formatQuantity", () => {
  it("keeps the decimals as entered, without padding", () => {
    expect(formatQuantity("74.328", "en")).toBe("74.328");
    expect(formatQuantity("74.328", "fr")).toBe("74,328");
    expect(formatQuantity("10", "en")).toBe("10");
    expect(formatQuantity("10", "fr")).toBe("10");
    expect(formatQuantity("1.5", "en")).toBe("1.5");
    expect(formatQuantity("1.5", "fr")).toBe("1,5");
  });

  it("keeps trailing zeros the string has", () => {
    expect(formatQuantity("1.50", "en")).toBe("1.50");
    expect(formatQuantity("1.50", "fr")).toBe("1,50");
  });

  it("groups thousands", () => {
    expect(formatQuantity("12345.6789", "en")).toBe("12,345.6789");
    expect(formatQuantity("12345.6789", "fr")).toBe(`12${NNBSP}345,6789`);
  });

  it("keeps every decimal of a long fraction", () => {
    expect(formatQuantity("0.123456789012", "en")).toBe("0.123456789012");
  });

  it("writes a negative quantity with a minus sign", () => {
    expect(formatQuantity("-5", "en")).toBe(`${MINUS}5`);
    expect(formatQuantity("-2.5", "fr")).toBe(`${MINUS}2,5`);
  });
});

describe("formatDate", () => {
  it("writes a calendar day, day before month", () => {
    expect(formatDate("2026-03-05", "en")).toBe("5 Mar");
    expect(formatDate("2026-03-05", "fr")).toBe("5 mars");
  });

  it("writes the month in full, with the year", () => {
    expect(formatDate("2026-03-05", "en", { style: "long" })).toBe("5 March");
    expect(formatDate("2026-03-05", "fr", { style: "long" })).toBe("5 mars");
    expect(formatDate("2026-02-12", "en", { style: "long", year: true })).toBe(
      "12 February 2026",
    );
    expect(formatDate("2026-02-12", "fr", { style: "long", year: true })).toBe(
      "12 février 2026",
    );
  });

  it("writes the weekday", () => {
    expect(formatDate("2026-03-05", "en", { style: "weekday" })).toBe(
      "Thu 5 Mar",
    );
    expect(formatDate("2026-03-05", "fr", { style: "weekday" })).toBe(
      "jeu. 5 mars",
    );
  });

  it("keeps a calendar day on its day in every time zone", () => {
    for (const timeZone of ["Pacific/Kiritimati", "Pacific/Pago_Pago"]) {
      expect(formatDate("2026-03-05", "en", { timeZone })).toBe("5 Mar");
    }
  });

  it("reads a timestamp's day in the given time zone", () => {
    const at = "2026-03-05T23:30:00+00:00";
    expect(formatDate(at, "en", { timeZone: "UTC" })).toBe("5 Mar");
    expect(formatDate(at, "fr", { timeZone: "Europe/Paris" })).toBe("6 mars");
  });

  it("refuses what isn't a day or a timestamp", () => {
    expect(() => formatDate("yesterday", "en")).toThrow(RangeError);
  });
});

describe("formatTime", () => {
  it("writes the time on the 24-hour clock", () => {
    const at = "2026-03-05T14:30:00+01:00";
    expect(formatTime(at, "en", { timeZone: "Europe/Paris" })).toBe("14:30");
    expect(formatTime(at, "fr", { timeZone: "Europe/Paris" })).toBe("14:30");
    expect(formatTime(at, "en", { timeZone: "UTC" })).toBe("13:30");
  });

  it("pads the hour", () => {
    const at = "2026-03-05T09:05:00Z";
    expect(formatTime(at, "en", { timeZone: "UTC" })).toBe("09:05");
    expect(formatTime(at, "fr", { timeZone: "UTC" })).toBe("09:05");
  });

  it("refuses a calendar day, which has no time", () => {
    expect(() => formatTime("2026-03-05", "en")).toThrow(RangeError);
  });
});
