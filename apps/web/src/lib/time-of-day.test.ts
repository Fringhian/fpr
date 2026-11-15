import { describe, expect, it } from "vitest";
import { timeOfDay } from "./time-of-day";

/** A moment on the browser's clock, at the given hour and minute. */
function at(hour: number, minute = 0): Date {
  return new Date(2026, 2, 5, hour, minute);
}

describe("timeOfDay", () => {
  it("is morning from 5:00 until noon", () => {
    expect(timeOfDay(at(5))).toBe("morning");
    expect(timeOfDay(at(11, 59))).toBe("morning");
  });

  it("is afternoon from noon until 18:00", () => {
    expect(timeOfDay(at(12))).toBe("afternoon");
    expect(timeOfDay(at(17, 59))).toBe("afternoon");
  });

  it("is evening from 18:00 until 5:00", () => {
    expect(timeOfDay(at(18))).toBe("evening");
    expect(timeOfDay(at(0))).toBe("evening");
    expect(timeOfDay(at(4, 59))).toBe("evening");
  });
});
