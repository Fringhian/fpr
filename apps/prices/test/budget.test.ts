import { Writable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLogger } from "../src/logger.js";
import { type CallBudget, createCallBudget } from "../src/market/budget.js";
import {
  createEodhdProvider,
  eodhdLatestBatchSize,
} from "../src/providers/eodhd.js";
import type { Fetch } from "../src/providers/http.js";

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
    calls: createCallBudget({ limit, timeZone: "Europe/Paris", now: time.now }),
  };
}

describe("the daily call budget", () => {
  it("refuses calls past the cap, and counts none of them", () => {
    const { calls } = budget();
    expect(calls.trySpend(8)).toBe(true);
    expect(calls.trySpend(3)).toBe(false);
    expect(calls.spent()).toBe(8);
    expect(calls.trySpend(2)).toBe(true);
    expect(calls.left()).toBe(0);
  });

  it("restarts at midnight in its time zone, not in UTC", () => {
    const { calls, time } = budget(10, "2026-03-02T22:00:00+01:00");
    calls.trySpend(10);

    time.set("2026-03-02T22:59:59Z");
    expect(calls.canSpend(1)).toBe(false);
    // 23:00 UTC is already midnight the next day in Paris.
    time.set("2026-03-02T23:00:00Z");
    expect(calls.spent()).toBe(0);
    expect(calls.trySpend(10)).toBe(true);
  });

  it("refuses a lookup once the calls left are no more than every schedule's calls left", () => {
    const { calls } = budget(100);
    calls.addScheduledCalls(() => 60);
    const remove = calls.addScheduledCalls(() => 20);

    calls.trySpend(19);
    expect(calls.allowsLookup()).toBe(true);
    expect(calls.allowsLookup(2)).toBe(false);
    calls.trySpend(1);
    expect(calls.allowsLookup()).toBe(false);
    // The schedules still spend their share.
    expect(calls.trySpend(80)).toBe(true);

    remove();
    expect(calls.scheduledCallsLeft()).toBe(60);
  });
});

describe("provider calls against the budget", () => {
  let fetchMock: ReturnType<typeof vi.fn<Fetch>>;
  let rawLines: string[];

  function provider(calls: CallBudget) {
    const destination = new Writable({
      write(chunk, _encoding, callback) {
        rawLines.push(chunk.toString());
        callback();
      },
    });
    return createEodhdProvider({
      apiKey: "test-eodhd-key",
      logger: createLogger({ destination }),
      budget: calls,
      fetch: fetchMock,
      baseUrl: "https://eodhd.test/api",
    });
  }

  function logLines(): Record<string, unknown>[] {
    return rawLines
      .join("")
      .split("\n")
      .filter((line) => line.length > 0)
      .map((line) => JSON.parse(line) as Record<string, unknown>);
  }

  function json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  beforeEach(() => {
    fetchMock = vi.fn<Fetch>();
    rawLines = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(() => {
        throw new Error("A test reached the global fetch");
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("counts the calls each request is billed, a failed one included", async () => {
    const { calls } = budget(100);
    fetchMock
      .mockResolvedValueOnce(json([]))
      .mockResolvedValueOnce(json([]))
      .mockResolvedValueOnce(json({}, 404));
    const eodhd = provider(calls);

    await eodhd.lookup("EXA");
    await eodhd.latest(["EXA.PA", "B.PA", "C.PA"]);
    await eodhd.closes("NONE.PA", "2026-03-02", "2026-03-02").catch(() => {});

    expect(calls.spent()).toBe(5);
    expect(logLines().map((line) => line.callsToday)).toEqual([1, 4, 5]);
  });

  it("refuses a call past the cap without sending it, and logs the refusal", async () => {
    const { calls } = budget(2);
    fetchMock.mockResolvedValue(json([]));
    const eodhd = provider(calls);

    await eodhd.lookup("EXA");
    await expect(eodhd.latest(["EXA.PA", "B.PA"])).rejects.toMatchObject({
      name: "ProviderError",
      reason: "call_budget_used",
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(calls.spent()).toBe(1);
    expect(logLines()).toContainEqual(
      expect.objectContaining({
        level: "warn",
        message: "provider call refused: daily call cap reached",
        calls: 2,
        callsToday: 1,
        callLimit: 2,
      }),
    );
  });

  it("stops the batches of latest at the cap", async () => {
    const { calls } = budget(eodhdLatestBatchSize + 5);
    const symbols = Array.from({ length: 30 }, (_, i) => `S${i}.PA`);
    fetchMock.mockResolvedValue(json([]));

    await expect(provider(calls).latest(symbols)).rejects.toMatchObject({
      reason: "call_budget_used",
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(calls.spent()).toBe(eodhdLatestBatchSize);
  });
});
