import { describe, expect, it } from "vitest";
import { dayIn } from "./time.js";

describe("dayIn", () => {
  it("gives the day in the time zone, not in UTC", () => {
    const moment = new Date("2026-03-01T23:30:00Z");
    expect(dayIn(moment, "Europe/Paris")).toBe("2026-03-02");
    expect(dayIn(moment, "America/New_York")).toBe("2026-03-01");
  });

  it("pads the month and the day", () => {
    expect(dayIn(new Date("2026-01-05T12:00:00Z"), "Europe/Paris")).toBe(
      "2026-01-05",
    );
  });
});
