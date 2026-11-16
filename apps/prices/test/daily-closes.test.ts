import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  holdMarketShare,
  mockMarket,
  pricesOf,
  providerRequests,
} from "./market.js";
import { startTestApp, type TestApp } from "./test-app.js";

let app: TestApp;

// Tuesday 3 March, 07:00 in Paris: the last trading day is Monday 2 March.
const NOW = new Date("2026-03-03T07:00:00+01:00");

beforeAll(async () => {
  app = await startTestApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(() => {
  app.now = NOW;
});

afterEach(async () => {
  app.provider.mockClear();
  app.pricing.dailyCloses.stop();
  await app.db.deleteFrom("portfolioChanges").execute();
  await app.db.deleteFrom("shares").execute();
  await app.db.deleteFrom("user").execute();
});

async function addPrice(
  shareId: string,
  at: string,
  source: "close" | "intraday",
  priceEur = "9",
) {
  await app.db
    .insertInto("prices")
    .values({ shareId, at: new Date(at), priceEur, source })
    .execute();
}

const share = (symbol: string, isin: string) =>
  holdMarketShare(app, {
    symbol,
    currency: "EUR",
    isin,
    heldFrom: "2026-02-02T10:00:00+01:00",
  });

describe("daily closes", () => {
  it("stores the closes since each share's latest, fills missing ones, skips a close at zero, and deletes week-old intraday prices", async () => {
    const tracked = await share("EXA.PA", "FR0EXAMPLE01");
    const missing = await share("EXB.PA", "FR0EXAMPLE02");
    await addPrice(tracked, "2026-01-30T23:59:59+01:00", "close");
    await addPrice(tracked, "2026-02-26T23:59:59+01:00", "close");
    await addPrice(tracked, "2026-02-23T10:00:00+01:00", "intraday");
    await addPrice(tracked, "2026-02-25T10:00:00+01:00", "intraday");
    mockMarket(app, {
      eod: {
        "EXA.PA": [
          { date: "2026-02-27", close: 10 },
          { date: "2026-03-02", close: 0 },
        ],
        "EXB.PA": [{ date: "2026-01-30", close: 5 }],
      },
    });

    await app.pricing.dailyCloses.run();

    expect(providerRequests(app)).toEqual([
      "eod EXA.PA 2026-02-27..2026-03-02",
      "eod EXB.PA 2026-01-26..2026-03-02",
    ]);
    // The zero close of 2 March is skipped: 27 February stays the latest.
    expect(await pricesOf(app, tracked)).toEqual([
      "2026-01-30T22:59:59.000Z close 9",
      "2026-02-25T09:00:00.000Z intraday 9",
      "2026-02-26T22:59:59.000Z close 9",
      "2026-02-27T22:59:59.000Z close 10",
    ]);
    expect(await pricesOf(app, missing)).toEqual([
      "2026-01-30T22:59:59.000Z close 5",
    ]);
    expect(app.logs()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: "warn",
          symbol: "EXA.PA",
          day: "2026-03-02",
        }),
        expect.objectContaining({
          level: "info",
          message: "daily closes run",
          run: "daily-closes",
          closesStored: 2,
          deleted: 1,
          callsToday: 2,
        }),
      ]),
    );
    expect(app.retries).toEqual([]);
  });

  it("retries a failing share every hour, three times, keeping their calls, then logs its missing days as an error", async () => {
    await share("EXC.PA", "FR0EXAMPLE03");
    await app.pricing.listHeld();
    app.provider.mockImplementation(
      async () => new Response("down", { status: 502 }),
    );
    const { budget } = app.pricing.deps;
    // 28 refreshes left today for one held share.
    expect(budget.scheduledCallsLeft()).toBe(28);

    await app.pricing.dailyCloses.run();
    expect(budget.scheduledCallsLeft()).toBe(28 + 3);

    for (let attempt = 2; attempt <= 4; attempt += 1) {
      expect(app.retries).toHaveLength(1);
      app.retries.shift()?.();
      await vi.waitFor(() =>
        expect(app.provider).toHaveBeenCalledTimes(attempt),
      );
    }
    await vi.waitFor(() =>
      expect(app.logs()).toContainEqual(
        expect.objectContaining({
          level: "error",
          message: "closes still missing after every retry",
          symbol: "EXC.PA",
          from: "2026-01-26",
          to: "2026-03-02",
        }),
      ),
    );
    expect(app.retries).toEqual([]);
    expect(budget.scheduledCallsLeft()).toBe(28);
  });

  // Last: it spends the day's calls.
  it("waits for the next day once the cap is reached, still deleting old intraday prices", async () => {
    const id = await share("EXD.PA", "FR0EXAMPLE04");
    await addPrice(id, "2026-02-20T10:00:00+01:00", "intraday");
    const { budget } = app.pricing.deps;
    budget.trySpend(budget.left());

    await app.pricing.dailyCloses.run();

    expect(app.provider).not.toHaveBeenCalled();
    expect(await pricesOf(app, id)).toEqual([]);
    expect(app.logs()).toContainEqual(
      expect.objectContaining({
        level: "warn",
        message: "daily closes skipped: daily call cap reached",
      }),
    );
  });
});
