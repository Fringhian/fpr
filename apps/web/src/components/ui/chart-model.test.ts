import { describe, expect, it } from "vitest";
import {
  chartDays,
  dayToTime,
  lastPoint,
  nearestLine,
  splitLine,
  stepIndex,
  timeToDay,
  toDecimal,
} from "./chart-model";

const points = [
  { day: "2026-03-04", value: "102.00" },
  { day: "2026-03-02", value: "100.00" },
  { day: "2026-03-03", value: "101.50" },
];

describe("dayToTime and timeToDay", () => {
  it("round-trip a day through midnight UTC", () => {
    expect(dayToTime("2026-03-02")).toBe(Date.UTC(2026, 2, 2) / 1000);
    expect(timeToDay(dayToTime("2026-03-02"))).toBe("2026-03-02");
  });
});

describe("splitLine", () => {
  it("keeps a line without a dashed part whole, in day order", () => {
    const { solid, dashed } = splitLine({ points });
    expect(solid.map((point) => point.day)).toEqual([
      "2026-03-02",
      "2026-03-03",
      "2026-03-04",
    ]);
    expect(dashed).toEqual([]);
  });

  it("starts the dashed part on the last final point, so both parts join", () => {
    const { solid, dashed } = splitLine({ points, dashedAfter: "2026-03-03" });
    expect(solid.map((point) => point.day)).toEqual([
      "2026-03-02",
      "2026-03-03",
    ]);
    expect(dashed.map((point) => point.day)).toEqual([
      "2026-03-03",
      "2026-03-04",
    ]);
  });

  it("draws nothing dashed when no point comes after the last final day", () => {
    const { dashed } = splitLine({ points, dashedAfter: "2026-03-04" });
    expect(dashed).toEqual([]);
  });

  it("dashes the whole line when every point comes after it", () => {
    const { solid, dashed } = splitLine({ points, dashedAfter: "2026-03-01" });
    expect(solid).toEqual([]);
    expect(dashed).toHaveLength(3);
  });
});

describe("chartDays", () => {
  it("lists every day of every line once, in order", () => {
    expect(
      chartDays([
        { points },
        { points: [{ day: "2026-03-05", value: "1.0" }, ...points] },
      ]),
    ).toEqual(["2026-03-02", "2026-03-03", "2026-03-04", "2026-03-05"]);
  });
});

describe("lastPoint", () => {
  it("finds the latest day, whatever the order", () => {
    expect(lastPoint({ points })).toEqual({
      day: "2026-03-04",
      value: "102.00",
    });
  });

  it("has nothing for a line without points", () => {
    expect(lastPoint({ points: [] })).toBeUndefined();
  });
});

describe("nearestLine", () => {
  const lines = [
    { id: "lea", y: 40 },
    { id: "max", y: 52 },
    { id: "noor", y: 120 },
  ];

  it("picks the nearest line within reach", () => {
    expect(nearestLine(lines, 47, 12)).toBe("max");
    expect(nearestLine(lines, 44, 12)).toBe("lea");
  });

  it("picks nothing beyond reach", () => {
    expect(nearestLine(lines, 86, 12)).toBeUndefined();
    expect(nearestLine([], 10, 12)).toBeUndefined();
  });
});

describe("toDecimal", () => {
  it("writes two decimals and never a negative zero", () => {
    expect(toDecimal(102.5)).toBe("102.50");
    expect(toDecimal(-1.234)).toBe("-1.23");
    expect(toDecimal(-0.001)).toBe("0.00");
  });
});

describe("stepIndex", () => {
  it("starts on the latest point at the first arrow", () => {
    expect(stepIndex("ArrowLeft", null, 5)).toBe(4);
    expect(stepIndex("ArrowRight", null, 5)).toBe(4);
  });

  it("moves one point and stops at the ends", () => {
    expect(stepIndex("ArrowLeft", 2, 5)).toBe(1);
    expect(stepIndex("ArrowRight", 2, 5)).toBe(3);
    expect(stepIndex("ArrowLeft", 0, 5)).toBe(0);
    expect(stepIndex("ArrowRight", 4, 5)).toBe(4);
  });

  it("jumps to the first and last points", () => {
    expect(stepIndex("Home", 2, 5)).toBe(0);
    expect(stepIndex("End", 2, 5)).toBe(4);
  });

  it("ignores other keys and empty charts", () => {
    expect(stepIndex("ArrowUp", 2, 5)).toBeUndefined();
    expect(stepIndex("ArrowLeft", null, 0)).toBeUndefined();
  });
});
