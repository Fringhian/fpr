import { apiContract, type Portfolio } from "@fpr/contracts";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Auth } from "../../src/auth/auth.js";
import { expectError } from "../access-support.js";
import { addRace, raceSeries } from "../race-support.js";
import {
  addSignedIn,
  apiRequest,
  createTestAuth,
  parseOutput,
  serveApp,
  type TestServer,
} from "../test-support.js";

let test: TestDatabase;
let auth: Auth;
let server: TestServer;
let race: Awaited<ReturnType<typeof addRace>>;
let guest: string;

beforeAll(async () => {
  test = await createTestDatabase();
  auth = createTestAuth(test.db);
  server = await serveApp({ db: test.db, auth, series: raceSeries(test.db) });
  race = await addRace(test.db, auth);
  guest = (await addSignedIn(server, test.db, auth, "guest")).cookie;
});

afterAll(async () => {
  await server.close();
  await test.drop();
});

const { get } = apiContract.portfolio;

const portfolioOf = (userId: string, cookie = guest, period = "1D") =>
  apiRequest(server, `/users/${userId}/portfolio?period=${period}`, {
    cookie,
  });

describe("GET /users/{userId}/portfolio", () => {
  it("values each holding now, with its gain over the period, weight and price series", async () => {
    const response = await portfolioOf(race.alex.id);
    const body = parseOutput(get, await response.json());

    expect(body).toMatchObject({
      latestPricesAt: "2026-11-11T09:00:00.000Z",
      balanceEur: "250.00",
      sharesEur: "160.00",
      sharesWeight: "64.00",
      cashEur: "90.00",
      cashWeight: "36.00",
      cashSetAt: "2026-11-02T09:00:00.000Z",
      gain: { eur: "40.00", percent: "19.05" },
      firstEntryOn: "2026-11-02",
      measuredFrom: null,
      incomplete: false,
    });
    expect(body.holdings).toEqual([
      expect.objectContaining({
        share: expect.objectContaining({ id: race.shares.a.id }),
        quantity: "10",
        valueEur: "160.00",
        weight: "64.00",
        gain: { eur: "40.00", percent: "33.33" },
        latestPrice: {
          at: "2026-11-11T09:00:00.000Z",
          priceEur: "16",
          source: "intraday",
        },
        pricesFrom: null,
      }),
    ]);
    expect(body.holdings[0]?.series.map(({ priceEur }) => priceEur)).toEqual([
      "12",
      "15",
      "16",
    ]);
  });

  it("counts a purchase in the period at its day's close, not as a gain", async () => {
    const body = parseOutput(
      get,
      await (await portfolioOf(race.blake.id, guest, "1W")).json(),
    );
    const a = body.holdings.find(({ share }) => share.id === race.shares.a.id);

    // Bought on Monday 9 at its 12 € close, worth 16 € now.
    expect(a?.gain).toEqual({ eur: "40.00", percent: "33.33" });
  });

  it("leaves a share with no price out of the balance, marked incomplete", async () => {
    const body = parseOutput(
      get,
      await (await portfolioOf(race.cleo.id)).json(),
    );

    expect(body).toMatchObject({
      balanceEur: "50.00",
      incomplete: true,
      measuredFrom: null,
    });
    expect(body.holdings[0]).toMatchObject({
      quantity: "2",
      valueEur: null,
      weight: null,
      gain: null,
      latestPrice: null,
    });
  });

  it("answers an empty portfolio for a member with no entry, and not_found for a guest", async () => {
    const empty = parseOutput(
      get,
      await (await portfolioOf(race.dana.id)).json(),
    );
    const someGuest = await addSignedIn(server, test.db, auth, "guest");

    expect(empty).toMatchObject({
      balanceEur: "0.00",
      cashSetAt: null,
      firstEntryOn: null,
      holdings: [],
    });
    await expectError(get, await portfolioOf(someGuest.id), "not_found");
  });

  it("gives an anonymous viewer weights in place of euros, quantities and cash", async () => {
    const { cookie } = await addSignedIn(server, test.db, auth, "anonymous");
    const body = (await (
      await portfolioOf(race.alex.id, cookie)
    ).json()) as Portfolio;

    expect(body.balanceEur).toBeUndefined();
    expect(body.cashEur).toBe("36.00");
    expect(body.holdings[0]?.quantity).toBe("64.00");
    expect(body.holdings[0]).not.toHaveProperty("valueEur");
  });
});
