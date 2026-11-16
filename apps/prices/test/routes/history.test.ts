import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import {
  holdMarketShare,
  mockMarket,
  pricesOf,
  providerRequests,
} from "../market.js";
import { startTestApp, type TestApp } from "../test-app.js";

let app: TestApp;

// A Wednesday: the last trading day is Tuesday 3 March.
const NOW = new Date("2026-03-04T10:00:00+01:00");

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

const fill = (id: string, from: string) =>
  app.call("POST", `/shares/${id}/history`, { from });

describe("POST /shares/:id/history", () => {
  it("fetches from a week before a weekend start to the last trading day, plus the latest price, in EUR", async () => {
    const id = await holdMarketShare(app, {
      symbol: "EXA.US",
      currency: "USD",
      isin: "US0EXAMPLE01",
      heldFrom: "2026-02-28T11:00:00+01:00",
    });
    mockMarket(app, {
      eod: {
        "EXA.US": [
          { date: "2026-02-20", close: 48 },
          { date: "2026-02-27", close: 50 },
          { date: "2026-03-03", close: 52.5 },
        ],
      },
      latest: { "EXA.US": { close: 51.25, at: "2026-03-04T09:30:00+01:00" } },
      rates: { "2026-02-20": { USD: 1.25 }, "2026-03-03": { USD: 1.25 } },
    });

    const first = await fill(id, "2026-02-28");

    expect(first).toEqual({ status: 200, body: { historyStartsOn: null } });
    expect(providerRequests(app)).toEqual([
      "eod EXA.US 2026-02-21..2026-03-03",
      "real-time EXA.US",
    ]);
    // Closes at 23:59:59 in Paris, divided by the day's USD rate.
    expect(await pricesOf(app, id)).toEqual([
      "2026-02-27T22:59:59.000Z close 40",
      "2026-03-03T22:59:59.000Z close 42",
      "2026-03-04T08:30:00.000Z intraday 41",
    ]);

    // A stored close is never fetched again.
    expect(await fill(id, "2026-02-28")).toEqual(first);
    expect(app.provider).toHaveBeenCalledTimes(2);
  });

  it("gives a holiday start the close before it, and converts nothing in EUR", async () => {
    const id = await holdMarketShare(app, {
      symbol: "EXB.PA",
      currency: "EUR",
      isin: "FR0EXAMPLE02",
      heldFrom: "2026-01-01T12:00:00+01:00",
    });
    mockMarket(app, {
      eod: {
        "EXB.PA": [
          { date: "2025-12-31", close: 74.328 },
          { date: "2026-01-02", close: 75.1 },
        ],
      },
    });

    expect(await fill(id, "2026-01-01")).toEqual({
      status: 200,
      body: { historyStartsOn: null },
    });
    expect(providerRequests(app)[0]).toBe("eod EXB.PA 2025-12-25..2026-03-03");
    expect(await pricesOf(app, id)).toEqual([
      "2025-12-31T22:59:59.000Z close 74.328",
      "2026-01-02T22:59:59.000Z close 75.1",
    ]);
    expect(app.rates).not.toHaveBeenCalled();
  });

  it("stores where the provider's history starts, and never fetches before it again", async () => {
    const id = await holdMarketShare(app, {
      symbol: "EXC.PA",
      currency: "EUR",
      isin: "FR0EXAMPLE03",
      heldFrom: "2025-01-06T10:00:00+01:00",
    });
    mockMarket(app, {
      eod: { "EXC.PA": [{ date: "2025-03-03", close: 20 }] },
    });

    expect((await fill(id, "2025-01-06")).body).toEqual({
      historyStartsOn: "2025-03-03",
    });
    expect((await fill(id, "2024-12-02")).body).toEqual({
      historyStartsOn: "2025-03-03",
    });
    expect(providerRequests(app)).toEqual([
      "eod EXC.PA 2024-12-30..2026-03-03",
      "real-time EXC.PA",
    ]);
  });

  it("fetches only the days before the stored closes for an earlier holding", async () => {
    const id = await holdMarketShare(app, {
      symbol: "EXD.PA",
      currency: "EUR",
      isin: "FR0EXAMPLE04",
      heldFrom: "2026-02-25T10:00:00+01:00",
    });
    await app.db
      .insertInto("prices")
      .values({
        shareId: id,
        at: new Date("2026-03-02T23:59:59+01:00"),
        priceEur: "30",
        source: "close",
      })
      .execute();
    mockMarket(app, {
      eod: { "EXD.PA": [{ date: "2026-02-24", close: 29 }] },
    });

    await fill(id, "2026-02-25");

    expect(providerRequests(app)[0]).toBe("eod EXD.PA 2026-02-18..2026-03-01");
    expect(await pricesOf(app, id)).toEqual([
      "2026-02-24T22:59:59.000Z close 29",
      "2026-03-02T22:59:59.000Z close 30",
    ]);
  });

  it("answers not_found for a manual or unknown share, and provider_unavailable when the provider fails", async () => {
    const manual = await app.db
      .insertInto("shares")
      .values({
        isin: "QZ0EXAMPLE16",
        name: "Example Certificate",
        kind: "manual",
        tradingCurrency: null,
        providerSymbol: null,
        exchange: null,
        historyStartsOn: null,
        createdBy: null,
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    const market = await holdMarketShare(app, {
      symbol: "EXE.PA",
      currency: "EUR",
      isin: "FR0EXAMPLE05",
      heldFrom: "2026-02-25T10:00:00+01:00",
    });
    app.provider.mockResolvedValue(new Response("down", { status: 502 }));

    expect((await fill(manual.id, "2026-02-25")).status).toBe(404);
    expect(
      (await fill("01900000-0000-7000-8000-000000000000", "2026-02-25")).status,
    ).toBe(404);
    expect(await fill(market, "2026-02-25")).toEqual({
      status: 503,
      body: { error: { code: "provider_unavailable" } },
    });
  });
});
