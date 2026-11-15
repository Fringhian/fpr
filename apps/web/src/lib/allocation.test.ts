import { describe, expect, it } from "vitest";
import {
  type AllocationHolding,
  type AllocationPart,
  allocate,
  LIGHTEST_TONE,
  STRONGEST_TONE,
  toneAt,
} from "./allocation";

function holding(name: string, weight: string | null): AllocationHolding {
  return { id: name.toLowerCase().replaceAll(" ", "-"), name, weight };
}

function total(parts: readonly AllocationPart[]): number {
  return parts.reduce(
    (sum, part) => sum + Math.round(Number(part.weight) * 10),
    0,
  );
}

const EIGHT = [
  holding("Alpha Index ETF", "20.0"),
  holding("Beta Tech Fund", "15.0"),
  holding("Gamma Health ETF", "12.0"),
  holding("Delta Energy SA", "10.0"),
  holding("Epsilon Rail AG", "8.0"),
  holding("Zeta Bank SA", "6.0"),
  holding("Eta Water Corp", "4.0"),
  holding("Theta Dividend ETF", "3.0"),
];

describe("allocate", () => {
  it("lists the shares biggest first, then the cash", () => {
    const parts = allocate(
      [
        holding("Beta Tech Fund", "24.1"),
        holding("Alpha Index ETF", "47.7"),
        holding("Gamma Health ETF", "12.0"),
      ],
      "16.2",
    );
    expect(parts).toEqual([
      {
        kind: "share",
        id: "alpha-index-etf",
        name: "Alpha Index ETF",
        weight: "47.7",
        tone: 100,
      },
      {
        kind: "share",
        id: "beta-tech-fund",
        name: "Beta Tech Fund",
        weight: "24.1",
        tone: 67,
      },
      {
        kind: "share",
        id: "gamma-health-etf",
        name: "Gamma Health ETF",
        weight: "12.0",
        tone: 34,
      },
      { kind: "cash", weight: "16.2" },
    ]);
  });

  it("names five shares and folds the rest into Other", () => {
    const parts = allocate(EIGHT, "22.0");
    expect(parts.map((part) => part.kind)).toEqual([
      "share",
      "share",
      "share",
      "share",
      "share",
      "other",
      "cash",
    ]);
    expect(parts[5]).toMatchObject({ kind: "other", count: 3, weight: "13.0" });
  });

  it("folds even a single share past the fifth", () => {
    const parts = allocate(EIGHT.slice(0, 6), null);
    expect(parts).toHaveLength(6);
    expect(parts[5]).toMatchObject({ kind: "other", count: 1 });
  });

  it("adds up to exactly 100.0% after rounding", () => {
    const thirds = allocate(
      [holding("Alpha Index ETF", "1"), holding("Beta Tech Fund", "1")],
      "1",
    );
    expect(thirds.map((part) => part.weight)).toEqual(["33.4", "33.3", "33.3"]);
    expect(total(thirds)).toBe(1000);
    expect(total(allocate(EIGHT, "22.0"))).toBe(1000);
  });

  it("reads the weights as shares of their own total", () => {
    // The API's weights may drift from 100 by its own rounding.
    const parts = allocate(
      [holding("Alpha Index ETF", "60.04"), holding("Beta Tech Fund", "40.03")],
      null,
    );
    expect(parts.map((part) => part.weight)).toEqual(["60.0", "40.0"]);
  });

  it("leaves out pending shares, zero weights and no cash", () => {
    const parts = allocate(
      [
        holding("Alpha Index ETF", "70.0"),
        holding("Nordic Pending AG", null),
        holding("Beta Tech Fund", "0"),
      ],
      "0",
    );
    expect(parts).toEqual([
      {
        kind: "share",
        id: "alpha-index-etf",
        name: "Alpha Index ETF",
        weight: "100.0",
        tone: 100,
      },
    ]);
  });

  it("keeps the given order between equal weights", () => {
    const parts = allocate(
      [holding("Beta Tech Fund", "50"), holding("Alpha Index ETF", "50")],
      null,
    );
    expect(
      parts.map((part) => (part.kind === "share" ? part.name : part.kind)),
    ).toEqual(["Beta Tech Fund", "Alpha Index ETF"]);
  });

  it("is all cash with no priced share", () => {
    expect(allocate([holding("Nordic Pending AG", null)], "100")).toEqual([
      { kind: "cash", weight: "100.0" },
    ]);
  });

  it("is empty with nothing to split", () => {
    expect(allocate([], null)).toEqual([]);
    expect(allocate([holding("Nordic Pending AG", null)], "0")).toEqual([]);
  });

  it("draws each coloured part lighter than the one before, Other the lightest", () => {
    const tones = allocate(EIGHT, "22.0").flatMap((part) =>
      part.kind === "cash" ? [] : [part.tone],
    );
    expect(tones).toHaveLength(6);
    expect(tones[0]).toBe(STRONGEST_TONE);
    expect(tones.at(-1)).toBe(LIGHTEST_TONE);
    for (const [index, tone] of tones.entries()) {
      if (index > 0) expect(tone).toBeLessThan(tones[index - 1] ?? Infinity);
    }
  });
});

describe("toneAt", () => {
  it("is the strongest tone for a single part", () => {
    expect(toneAt(0, 1)).toBe(STRONGEST_TONE);
  });

  it("steps evenly from the strongest to the lightest", () => {
    expect([0, 1, 2, 3].map((rank) => toneAt(rank, 4))).toEqual([
      100, 78, 56, 34,
    ]);
  });
});
