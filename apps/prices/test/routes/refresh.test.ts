import type {
  PricesRefreshRun,
  PricesRefreshState,
} from "@fpr/contracts/prices";
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
} from "../market.js";
import { startTestApp, type TestApp } from "../test-app.js";

let app: TestApp;

// A Wednesday, 10:10 in Paris: the next scheduled run is at 10:30.
const NOW = new Date("2026-03-04T10:10:00+01:00");

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
  app.rates.mockClear();
  await app.db.deleteFrom("portfolioChanges").execute();
  await app.db.deleteFrom("shares").execute();
  await app.db.deleteFrom("user").execute();
});

async function addClose(shareId: string, at: string, priceEur: string) {
  await app.db
    .insertInto("prices")
    .values({ shareId, at: new Date(at), priceEur, source: "close" })
    .execute();
}

describe("POST /refresh", () => {
  it("fills missing closes first, then stores the latest prices newer than each share's, from one batch", async () => {
    const missing = await holdMarketShare(app, {
      symbol: "EXA.US",
      currency: "USD",
      isin: "US0EXAMPLE01",
      heldFrom: "2026-03-02T10:00:00+01:00",
    });
    const priced = await holdMarketShare(app, {
      symbol: "EXB.PA",
      currency: "EUR",
      isin: "FR0EXAMPLE02",
      heldFrom: "2026-02-02T10:00:00+01:00",
    });
    await addClose(priced, "2026-01-30T23:59:59+01:00", "79");
    await app.db
      .insertInto("prices")
      .values({
        shareId: priced,
        at: new Date("2026-03-04T09:45:00+01:00"),
        priceEur: "81",
        source: "intraday",
      })
      .execute();
    mockMarket(app, {
      eod: {
        "EXA.US": [
          { date: "2026-02-27", close: 50 },
          { date: "2026-03-03", close: 50 },
        ],
      },
      latest: {
        "EXA.US": { close: 51.25, at: "2026-03-04T09:50:00+01:00" },
        // Older than the 09:45 price already stored.
        "EXB.PA": { close: 80, at: "2026-03-04T09:30:00+01:00" },
      },
      rates: { "2026-02-20": { USD: 1.25 } },
    });

    const { status, body } = await app.call("POST", "/refresh");

    expect(status).toBe(200);
    expect(body).toEqual({
      trigger: "request",
      status: "succeeded",
      startedAt: NOW.toISOString(),
      finishedAt: NOW.toISOString(),
      sharesPriced: 1,
      closesStored: 2,
      failures: 0,
    });
    expect(providerRequests(app)).toEqual([
      "eod EXA.US 2026-02-23..2026-03-03",
      "real-time EXA.US,EXB.PA",
    ]);
    expect(app.rates).toHaveBeenCalledTimes(1);
    expect(await pricesOf(app, missing)).toEqual([
      "2026-02-27T22:59:59.000Z close 40",
      "2026-03-03T22:59:59.000Z close 40",
      "2026-03-04T08:50:00.000Z intraday 41",
    ]);
    expect(await pricesOf(app, priced)).toHaveLength(2);
    expect(
      app.logs().find((line) => line.message === "refresh run"),
    ).toMatchObject({
      level: "info",
      run: "intraday",
      shares: 2,
      sharesPriced: 1,
      failures: 0,
      callsToday: 3,
      callLimit: 1000,
    });

    const state = await app.call("GET", "/refresh");
    expect(state.body).toEqual({
      lastRunAt: NOW.toISOString(),
      lastResult: body as PricesRefreshRun,
      nextRunAt: "2026-03-04T09:30:00.000Z",
      runsToday: 1,
      cap: { callLimit: 1000, callsToday: 3, callsLeft: 997 },
    } satisfies PricesRefreshState);
  });

  it("is refused while a run is going", async () => {
    const id = await holdMarketShare(app, {
      symbol: "EXC.PA",
      currency: "EUR",
      isin: "FR0EXAMPLE03",
      heldFrom: "2026-02-02T10:00:00+01:00",
    });
    await addClose(id, "2026-01-30T23:59:59+01:00", "10");
    let answer: (response: Response) => void = () => undefined;
    app.provider.mockImplementation(
      () => new Promise<Response>((resolve) => (answer = resolve)),
    );

    const first = app.call("POST", "/refresh");
    await vi.waitFor(() => expect(app.provider).toHaveBeenCalled());

    expect(await app.call("POST", "/refresh")).toEqual({
      status: 409,
      body: { error: { code: "refresh_running" } },
    });
    answer(new Response("[]", { status: 200 }));
    expect((await first).status).toBe(200);
  });

  it("is refused with provider_unavailable when every share failed", async () => {
    await holdMarketShare(app, {
      symbol: "EXD.PA",
      currency: "EUR",
      isin: "FR0EXAMPLE04",
      heldFrom: "2026-03-02T10:00:00+01:00",
    });
    app.provider.mockResolvedValue(new Response("down", { status: 502 }));

    expect(await app.call("POST", "/refresh")).toEqual({
      status: 503,
      body: { error: { code: "provider_unavailable" } },
    });
    const { body } = await app.call("GET", "/refresh");
    expect((body as PricesRefreshState).lastResult).toMatchObject({
      status: "failed",
      failures: 1,
    } satisfies Partial<PricesRefreshRun>);
  });

  // Last: it spends the day's calls.
  it("is refused once the cap is reached, and a scheduled run is skipped, unsent", async () => {
    await holdMarketShare(app, {
      symbol: "EXE.PA",
      currency: "EUR",
      isin: "FR0EXAMPLE05",
      heldFrom: "2026-03-02T10:00:00+01:00",
    });
    const { budget } = app.pricing.deps;
    budget.trySpend(budget.left());

    expect(await app.call("POST", "/refresh")).toEqual({
      status: 429,
      body: { error: { code: "call_budget_used" } },
    });
    const outcome = await app.pricing.refresh.run("schedule");
    expect(outcome?.run).toMatchObject({
      trigger: "schedule",
      status: "skipped",
    });
    expect(app.provider).not.toHaveBeenCalled();
  });
});
