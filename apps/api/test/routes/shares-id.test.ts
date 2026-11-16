import { apiContract } from "@fpr/contracts";
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
  signIn,
  type TestServer,
} from "../test-support.js";

let test: TestDatabase;
let auth: Auth;
let server: TestServer;
let race: Awaited<ReturnType<typeof addRace>>;

beforeAll(async () => {
  test = await createTestDatabase();
  auth = createTestAuth(test.db);
  server = await serveApp({ db: test.db, auth, series: raceSeries(test.db) });
  race = await addRace(test.db, auth);
});

afterAll(async () => {
  await server.close();
  await test.drop();
});

const { get } = apiContract.shares;

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
