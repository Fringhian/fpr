import { describe, expect, it } from "vitest";
import { attentionWindowStart, lastTradingDay } from "./trading-day.js";

const PARIS = "Europe/Paris";

describe("lastTradingDay", () => {
  it.each([
    // 2026-03-03 is a Tuesday. Paris is UTC+1 in March.
    ["Tuesday after the daily run", "2026-03-03T08:00:00+01:00", "2026-03-02"],
    ["Tuesday before the daily run", "2026-03-03T06:59:00+01:00", "2026-02-27"],
    ["Wednesday after the run", "2026-03-04T07:00:00+01:00", "2026-03-03"],
    ["Saturday after the run", "2026-03-07T10:00:00+01:00", "2026-03-06"],
    ["Sunday", "2026-03-08T12:00:00+01:00", "2026-03-06"],
    ["Monday during the day", "2026-03-09T15:00:00+01:00", "2026-03-06"],
    ["Monday before the run", "2026-03-09T01:00:00+01:00", "2026-03-06"],
  ])("is the right day on %s", (_, now, day) => {
    expect(lastTradingDay(new Date(now), PARIS)).toBe(day);
  });

  it("crosses a change to summer time", () => {
    // Sunday 29 March 2026: Paris moves to UTC+2. Monday 08:00 is 06:00 UTC.
    expect(lastTradingDay(new Date("2026-03-30T06:00:00Z"), PARIS)).toBe(
      "2026-03-27",
    );
    expect(lastTradingDay(new Date("2026-03-31T05:30:00Z"), PARIS)).toBe(
      "2026-03-30",
    );
  });

  it("reads the day and hour in the time zone", () => {
    // 07:30 in Paris on Wednesday is 06:30 UTC: past the run in Paris only.
    const now = new Date("2026-03-04T06:30:00Z");
    expect(lastTradingDay(now, PARIS)).toBe("2026-03-03");
    expect(lastTradingDay(now, "UTC")).toBe("2026-03-02");
  });
});

describe("attentionWindowStart", () => {
  it.each([
    // Last trading day Tuesday 3 March: Wednesday 25 February to Tuesday.
    ["Wednesday after the run", "2026-03-04T08:00:00+01:00", "2026-02-25"],
    // Last trading day Friday 6 March: Monday 2 to Friday 6 March.
    ["Saturday after the run", "2026-03-07T08:00:00+01:00", "2026-03-02"],
    // Last trading day Friday 27 February: Monday 23 to Friday 27.
    ["Tuesday before the run", "2026-03-03T06:00:00+01:00", "2026-02-23"],
  ])("spans five weekdays on %s", (_, now, day) => {
    expect(attentionWindowStart(new Date(now), PARIS)).toBe(day);
  });
});
