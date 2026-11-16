import { apiContract, type ShareList } from "@fpr/contracts";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Auth } from "../../src/auth/auth.js";
import { addRace, raceSeries } from "../race-support.js";
import {
  addSignedIn,
  apiRequest,
  createTestAuth,
  createTestPrices,
  parseOutput,
  pseudonymOf,
  serveApp,
  type TestPrices,
  type TestServer,
} from "../test-support.js";

let test: TestDatabase;
let auth: Auth;
let server: TestServer;
let prices: TestPrices;
let race: Awaited<ReturnType<typeof addRace>>;
let guest: string;

beforeAll(async () => {
  test = await createTestDatabase();
  auth = createTestAuth(test.db);
  prices = createTestPrices();
  server = await serveApp({
    db: test.db,
    auth,
    series: raceSeries(test.db),
    prices: prices.prices,
  });
  race = await addRace(test.db, auth);
  guest = (await addSignedIn(server, test.db, auth, "guest")).cookie;
});

afterAll(async () => {
  await server.close();
  await test.drop();
});

const search = async (query: string, cookie = guest) => {
  const response = await apiRequest(server, `/shares?${query}`, { cookie });
  expect(response.status).toBe(200);
  return (await response.json()) as ShareList;
};

describe("GET /shares", () => {
  it("lists every stored share, held ones first, most holders first, with price, change, series and holders", async () => {
    const body = parseOutput(
      apiContract.shares.search,
      await search("period=1D"),
    );

    expect(body.shares.map(({ id }) => id)).toEqual([
      race.shares.a.id,
      race.shares.b.id,
      race.shares.c.id,
      race.shares.d.id,
    ]);
    expect(body.shares[0]).toMatchObject({
      latestPrice: { priceEur: "16", source: "intraday" },
      change: { eur: "4.00", percent: "33.33" },
      holders: [{ id: race.alex.id }, { id: race.blake.id }],
    });
    expect(body.shares[0]?.series).toHaveLength(3);
    expect(body.shares[2]).toMatchObject({ latestPrice: null, change: null });
  });

  it("filters by name, ISIN or symbol in Postgres, without calling the provider", async () => {
    const byIsin = parseOutput(
      apiContract.shares.search,
      await search(`period=1D&q=${race.shares.b.isin.toLowerCase()}`),
    );
    const bySymbol = parseOutput(
      apiContract.shares.search,
      await search(`period=1D&q=${race.shares.c.providerSymbol}`),
    );
    const byName = parseOutput(
      apiContract.shares.search,
      await search(`period=1D&q=${encodeURIComponent(race.shares.d.name)}`),
    );

    expect(byIsin.shares.map(({ id }) => id)).toEqual([race.shares.b.id]);
    expect(bySymbol.shares.map(({ id }) => id)).toEqual([race.shares.c.id]);
    expect(byName.shares.map(({ id }) => id)).toEqual([race.shares.d.id]);
    expect(prices.requests).toEqual([]);
  });

  it("gives an anonymous viewer pseudonyms for the holders", async () => {
    const { cookie } = await addSignedIn(server, test.db, auth, "anonymous");
    const body = await search("period=1D", cookie);

    expect(body.shares[0]?.holders[0]?.displayName).toBe(
      await pseudonymOf(test.db, race.alex.id),
    );
    expect(body.shares[0]?.change).toEqual({ eur: "4.00", percent: "33.33" });
  });
});
