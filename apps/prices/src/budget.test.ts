import { describe, expect, it } from "vitest";
import { createCallBudget } from "./budget.js";

/** A clock tests move by hand. */
function clock(start: string) {
  let current = new Date(start);
  return {
    now: () => current,
    set(moment: string) {
      current = new Date(moment);
    },
  };
}

function budget(limit = 10, start = "2026-03-02T10:00:00+01:00") {
  const time = clock(start);
  return {
    time,
    budget: createCallBudget({
      limit,
      timeZone: "Europe/Paris",
      now: time.now,
    }),
  };
}

describe("createCallBudget", () => {
  it("starts the day at zero", () => {
    const { budget: calls } = budget();
    expect(calls.spent()).toBe(0);
    expect(calls.left()).toBe(10);
    expect(calls.limit).toBe(10);
  });

  it("counts the calls spent", () => {
    const { budget: calls } = budget();
    expect(calls.trySpend(3)).toBe(true);
    expect(calls.trySpend(4)).toBe(true);
    expect(calls.spent()).toBe(7);
    expect(calls.left()).toBe(3);
  });

  it("refuses calls past the cap, and counts none of them", () => {
    const { budget: calls } = budget();
    expect(calls.trySpend(8)).toBe(true);
    expect(calls.canSpend(2)).toBe(true);
    expect(calls.canSpend(3)).toBe(false);
    expect(calls.trySpend(3)).toBe(false);
    expect(calls.spent()).toBe(8);
    expect(calls.trySpend(2)).toBe(true);
    expect(calls.canSpend(1)).toBe(false);
    expect(calls.left()).toBe(0);
  });

  it("restarts at midnight in its time zone, not in UTC", () => {
    const { budget: calls, time } = budget(10, "2026-03-02T22:00:00+01:00");
    calls.trySpend(10);

    // 23:00 UTC is already midnight the next day in Paris.
    time.set("2026-03-02T23:00:00Z");
    expect(calls.spent()).toBe(0);
    expect(calls.canSpend(10)).toBe(true);
  });

  it("keeps the count until midnight", () => {
    const { budget: calls, time } = budget(10, "2026-03-02T00:00:00+01:00");
    calls.trySpend(10);

    time.set("2026-03-02T23:59:59+01:00");
    expect(calls.canSpend(1)).toBe(false);
  });

  it("lets the schedule spend again the next day once the cap is reached", () => {
    const { budget: calls, time } = budget();
    calls.trySpend(10);
    expect(calls.canSpend(1)).toBe(false);

    time.set("2026-03-03T00:00:00+01:00");
    expect(calls.trySpend(1)).toBe(true);
    expect(calls.spent()).toBe(1);
  });

  it("starts at zero when the service restarts", () => {
    const first = budget();
    first.budget.trySpend(9);
    const restarted = budget();
    expect(restarted.budget.spent()).toBe(0);
  });

  it("refuses a limit below one", () => {
    expect(() =>
      createCallBudget({ limit: 0, timeZone: "Europe/Paris" }),
    ).toThrow(RangeError);
  });

  it("refuses a negative or fractional number of calls", () => {
    const { budget: calls } = budget();
    expect(() => calls.trySpend(-1)).toThrow(RangeError);
    expect(() => calls.canSpend(1.5)).toThrow(RangeError);
  });
});

describe("allowsLookup", () => {
  it("allows a lookup when nothing is scheduled and calls are left", () => {
    const { budget: calls } = budget();
    expect(calls.allowsLookup()).toBe(true);
  });

  it("is refused once the calls left are no more than the scheduled calls left", () => {
    const { budget: calls } = budget();
    calls.addScheduledCalls(() => 4);
    calls.trySpend(5);

    // 5 left, 4 scheduled: a lookup leaves the schedule its 4.
    expect(calls.allowsLookup()).toBe(true);
    calls.trySpend(1);
    // 4 left, 4 scheduled.
    expect(calls.allowsLookup()).toBe(false);
    // The schedule still spends its share.
    expect(calls.trySpend(4)).toBe(true);
  });

  it("sums every schedule's calls left", () => {
    const { budget: calls } = budget(100);
    calls.addScheduledCalls(() => 60);
    calls.addScheduledCalls(() => 20);
    expect(calls.scheduledCallsLeft()).toBe(80);

    calls.trySpend(19);
    expect(calls.allowsLookup()).toBe(true);
    calls.trySpend(1);
    expect(calls.allowsLookup()).toBe(false);
  });

  it("weighs a request of several calls", () => {
    const { budget: calls } = budget();
    calls.addScheduledCalls(() => 7);
    expect(calls.allowsLookup(3)).toBe(true);
    expect(calls.allowsLookup(4)).toBe(false);
  });

  it("asks the schedules with the current moment", () => {
    const { budget: calls, time } = budget(1000);
    const runsLeft = (now: Date) =>
      // One call per remaining hour until 22:00 UTC, for the test.
      Math.max(0, 22 - now.getUTCHours());
    calls.addScheduledCalls(runsLeft);
    expect(calls.scheduledCallsLeft()).toBe(13);

    time.set("2026-03-02T21:00:00Z");
    expect(calls.scheduledCallsLeft()).toBe(1);
  });

  it("forgets a schedule once it is removed", () => {
    const { budget: calls } = budget();
    const remove = calls.addScheduledCalls(() => 10);
    expect(calls.allowsLookup()).toBe(false);
    remove();
    expect(calls.allowsLookup()).toBe(true);
  });

  it("refuses a schedule that reports a negative count", () => {
    const { budget: calls } = budget();
    calls.addScheduledCalls(() => -1);
    expect(() => calls.allowsLookup()).toThrow(RangeError);
  });
});

describe("logFields", () => {
  it("gives the day's count for a run's log line", () => {
    const { budget: calls, time } = budget();
    calls.trySpend(4);
    expect(calls.logFields()).toEqual({
      callsToday: 4,
      callsLeft: 6,
      callLimit: 10,
    });

    time.set("2026-03-03T08:00:00+01:00");
    expect(calls.logFields()).toEqual({
      callsToday: 0,
      callsLeft: 10,
      callLimit: 10,
    });
  });
});
