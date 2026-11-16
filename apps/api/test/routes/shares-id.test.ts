import { apiContract } from "@fpr/contracts";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import type { Auth } from "../../src/auth/auth.js";
import { apiError } from "../../src/errors.js";
import { expectError } from "../access-support.js";
import { addRace, raceSeries } from "../race-support.js";
import {
  addSignedIn,
  apiRequest,
  createTestAuth,
  createTestPrices,
  parseOutput,
  serveApp,
  signIn,
  type TestPrices,
  type TestServer,
} from "../test-support.js";

let test: TestDatabase;
let auth: Auth;
let server: TestServer;
let race: Awaited<ReturnType<typeof addRace>>;
let prices: TestPrices;
let clearSeries: MockInstance;

beforeAll(async () => {
  test = await createTestDatabase();
  auth = createTestAuth(test.db);
  prices = createTestPrices();
  const series = raceSeries(test.db);
  clearSeries = vi.spyOn(series, "clear");
  server = await serveApp({ db: test.db, auth, series, prices: prices.prices });
  race = await addRace(test.db, auth);
});

afterAll(async () => {
  await server.close();
  await test.drop();
});

beforeEach(() => {
  prices.reset();
  clearSeries.mockClear();
});

const { get, update, delete: deleteShare } = apiContract.shares;

const shareFor = (id: string, cookie: string) =>
  apiRequest(server, `/shares/${id}?period=1D`, { cookie });

describe("GET /shares/{id}", () => {
  it("gives the share, its latest price and change, and the member's position since they bought", async () => {
    const cookie = await signIn(server, race.blake);
    const body = parseOutput(
      get,
      await (await shareFor(race.shares.a.id, cookie)).json(),
    );

    expect(body).toMatchObject({
      id: race.shares.a.id,
      exchange: "PA",
      tradingCurrency: "EUR",
      historyStartsOn: null,
      latestPrice: {
        at: "2026-11-11T09:00:00.000Z",
        priceEur: "16",
        source: "intraday",
      },
      change: { eur: "4.00", percent: "33.33" },
      // 10 bought at Monday 9's close of 12 €, worth 160 € in a 250 € balance.
      position: {
        quantity: "10",
        valueEur: "160.00",
        weight: "64.00",
        gain: { eur: "40.00", percent: "33.33" },
      },
    });
  });

  it("removes cost at the average cost on a sale", async () => {
    await test.db
      .insertInto("portfolioChanges")
      .values({
        userId: race.alex.id,
        shareId: race.shares.b.id,
        quantityDelta: "4",
        effectiveAt: new Date("2026-11-03T10:00:00+01:00"),
        createdBy: race.alex.id,
      })
      .execute();
    await test.db
      .insertInto("portfolioChanges")
      .values({
        userId: race.alex.id,
        shareId: race.shares.b.id,
        quantityDelta: "-2",
        effectiveAt: new Date("2026-11-10T10:00:00+01:00"),
        createdBy: race.alex.id,
      })
      .execute();
    const cookie = await signIn(server, race.alex);
    const body = parseOutput(
      get,
      await (await shareFor(race.shares.b.id, cookie)).json(),
    );

    // Bought 4 at 20 €, sold 2 at their 20 € average cost: 2 left at 18 €.
    expect(body.position).toMatchObject({
      quantity: "2",
      valueEur: "36.00",
      gain: { eur: "-4.00", percent: "-10.00" },
    });
  });

  it("has no position for a guest, and is not_found for an unknown share", async () => {
    const { cookie } = await addSignedIn(server, test.db, auth, "guest");
    const body = parseOutput(
      get,
      await (await shareFor(race.shares.a.id, cookie)).json(),
    );

    expect(body.position).toBeNull();
    await expectError(
      get,
      await shareFor(crypto.randomUUID(), cookie),
      "not_found",
    );
  });
});

const shareId = "0196a1b2-0000-7000-8000-000000000004";

describe("PATCH /api/shares/:id", () => {
  it("renames a manual share at the price service", async () => {
    const member = await addSignedIn(server, test.db, auth, "member");
    const renamed = {
      id: shareId,
      isin: "XS0000000019",
      name: "Example Vineyard Estate",
      kind: "manual" as const,
      symbol: null,
    };
    prices.routes.updateShare = async () => renamed;

    const response = await apiRequest(server, `/shares/${shareId}`, {
      method: "PATCH",
      cookie: member.cookie,
      body: { name: renamed.name },
    });

    expect(response.status).toBe(200);
    expect(parseOutput(update, await response.json())).toEqual(renamed);
    expect(prices.requests[0]).toMatchObject({
      method: "PATCH",
      path: `/shares/${shareId}`,
      body: { name: renamed.name },
    });
    expect(clearSeries).toHaveBeenCalledOnce();
  });

  it("answers not_found for a market share, and isin_taken for a taken ISIN", async () => {
    const member = await addSignedIn(server, test.db, auth, "member");
    const patch = () =>
      apiRequest(server, `/shares/${shareId}`, {
        method: "PATCH",
        cookie: member.cookie,
        body: { isin: "XS0000000019" },
      });

    prices.routes.updateShare = async () => {
      throw apiError("not_found");
    };
    await expectError(update, await patch(), "not_found");

    const takenBy = "0196a1b2-0000-7000-8000-000000000005";
    prices.routes.updateShare = async () => {
      throw apiError("isin_taken", { shareId: takenBy });
    };
    await expectError(update, await patch(), "isin_taken", {
      shareId: takenBy,
    });
  });
});

describe("DELETE /api/shares/:id", () => {
  const remove = (cookie: string) =>
    apiRequest(server, `/shares/${shareId}`, { method: "DELETE", cookie });

  it("deletes a share for the admin", async () => {
    const admin = await addSignedIn(server, test.db, auth, "admin");

    const response = await remove(admin.cookie);

    expect(response.status).toBe(204);
    expect(prices.requests).toEqual([
      { method: "DELETE", path: `/shares/${shareId}`, body: undefined },
    ]);
    expect(clearSeries).toHaveBeenCalledOnce();
  });

  it("refuses a share a share change refers to", async () => {
    const admin = await addSignedIn(server, test.db, auth, "admin");
    prices.routes.deleteShare = async () => {
      throw apiError("share_in_use");
    };

    await expectError(deleteShare, await remove(admin.cookie), "share_in_use");
  });

  it("refuses everyone but the admin", async () => {
    for (const role of ["member", "guest", "anonymous"] as const) {
      const viewer = await addSignedIn(server, test.db, auth, role);
      await expectError(deleteShare, await remove(viewer.cookie), "forbidden");
    }
    expect(prices.requests).toEqual([]);
  });
});
