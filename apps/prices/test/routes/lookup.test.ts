import type { LookupResult, ShareSummary } from "@fpr/contracts";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { holdMarketShare, mockMarket, providerRequests } from "../market.js";
import { startTestApp, type TestApp } from "../test-app.js";

let app: TestApp;

// A Wednesday morning, inside the intraday refresh's hours.
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
  await app.db.deleteFrom("portfolioChanges").execute();
  await app.db.deleteFrom("shares").execute();
  await app.db.deleteFrom("user").execute();
});

const listing = (fields: Record<string, unknown>) => ({
  Code: "EXA",
  Name: "Example Industries",
  Type: "Common Stock",
  Currency: "EUR",
  ...fields,
});

const lookup = async (query: string) => {
  const { status, body } = await app.call("POST", "/lookup", { query });
  return { status, body: body as LookupResult };
};

describe("POST /lookup", () => {
  it("stores each new listing without history, one per ISIN on its primary exchange, in one call", async () => {
    mockMarket(app, {
      search: {
        EXA: [
          listing({
            Exchange: "XETRA",
            Country: "Germany",
            ISIN: "FR0EXAMPLE01",
            isPrimary: false,
          }),
          listing({
            Exchange: "PA",
            Country: "France",
            ISIN: "FR0EXAMPLE01",
            isPrimary: true,
          }),
          listing({
            Code: "EXAF",
            Exchange: "F",
            Country: "Germany",
            Currency: "USD",
          }),
        ],
      },
    });

    const first = await lookup("EXA");

    expect(first.status).toBe(200);
    expect(first.body).toEqual({
      shares: [
        {
          id: expect.any(String),
          isin: "FR0EXAMPLE01",
          name: "Example Industries",
          kind: "market",
          symbol: "EXA.PA",
        },
      ],
      listings: [
        {
          symbol: "EXAF.F",
          name: "Example Industries",
          exchange: "F",
          tradingCurrency: "USD",
        },
      ],
    });
    expect(providerRequests(app)).toEqual(["search EXA"]);
    expect(
      await app.db.selectFrom("prices").selectAll().execute(),
    ).toHaveLength(0);

    // A second lookup returns the stored share and stores nothing new.
    expect((await lookup("EXA")).body).toEqual(first.body);
    expect(
      await app.db.selectFrom("shares").selectAll().execute(),
    ).toHaveLength(1);
  });

  it("keeps the listing in the ISIN's country when none is marked primary", async () => {
    mockMarket(app, {
      search: {
        DE0EXAMPLE02: [
          listing({ Exchange: "PA", Country: "France", ISIN: "DE0EXAMPLE02" }),
          listing({
            Exchange: "XETRA",
            Country: "Germany",
            ISIN: "DE0EXAMPLE02",
          }),
        ],
      },
    });

    const { body } = await lookup("DE0EXAMPLE02");

    expect(body.shares.map(({ symbol }) => symbol)).toEqual(["EXA.XETRA"]);
  });

  it("refuses with provider_unavailable when the provider fails", async () => {
    app.provider.mockResolvedValue(new Response("down", { status: 500 }));

    expect(await app.call("POST", "/lookup", { query: "EXA" })).toEqual({
      status: 503,
      body: { error: { code: "provider_unavailable" } },
    });
  });

  it("refuses with call_budget_used, unsent, once the calls left are the schedule's", async () => {
    const capped = await startTestApp({ callLimit: 20 });
    try {
      capped.now = NOW;
      await holdMarketShare(capped, {
        symbol: "EXH.US",
        currency: "USD",
        isin: "US0EXAMPLE08",
        heldFrom: "2026-03-02T10:00:00+01:00",
      });
      // One held share: the 25 refreshes left today keep 25 calls, more than the 20.
      await capped.pricing.listHeld();

      expect(await capped.call("POST", "/lookup", { query: "EXA" })).toEqual({
        status: 429,
        body: { error: { code: "call_budget_used" } },
      });
      expect(capped.provider).not.toHaveBeenCalled();
    } finally {
      await capped.close();
    }
  });
});

describe("POST /shares/market", () => {
  it("stores a listing without an ISIN under the ISIN typed, and the next lookup finds it", async () => {
    mockMarket(app, {
      search: {
        EXAF: [listing({ Code: "EXAF", Exchange: "F", Country: "Germany" })],
      },
    });

    const { status, body } = await app.call("POST", "/shares/market", {
      symbol: "EXAF.F",
      isin: "DE0EXAMPLE03",
    });

    expect(status).toBe(201);
    const share = body as ShareSummary;
    expect(share).toMatchObject({
      isin: "DE0EXAMPLE03",
      kind: "market",
      symbol: "EXAF.F",
    });
    expect((await lookup("EXAF")).body).toEqual({
      shares: [share],
      listings: [],
    });
  });

  it("refuses an ISIN another share has, unsent, and a symbol the provider no longer has", async () => {
    mockMarket(app, {
      search: {
        EXA: [
          listing({ Exchange: "PA", Country: "France", ISIN: "FR0EXAMPLE01" }),
        ],
      },
    });
    const { body } = await lookup("EXA");
    app.provider.mockClear();

    expect(
      await app.call("POST", "/shares/market", {
        symbol: "EXAF.F",
        isin: "FR0EXAMPLE01",
      }),
    ).toEqual({
      status: 409,
      body: {
        error: { code: "isin_taken", details: { shareId: body.shares[0]?.id } },
      },
    });
    expect(app.provider).not.toHaveBeenCalled();

    expect(
      (
        await app.call("POST", "/shares/market", {
          symbol: "GONE.F",
          isin: "DE0EXAMPLE09",
        })
      ).status,
    ).toBe(404);
  });
});
