import { apiContract, type PortfolioBalanceHistory } from "@fpr/contracts";
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

const { balanceHistory } = apiContract.portfolio;

const historyOf = (userId: string, period: string, cookie = guest) =>
  apiRequest(server, `/users/${userId}/balance-history?period=${period}`, {
    cookie,
  });

describe("GET /users/{userId}/balance-history", () => {
  it("gives the balance at each close of the period, then at each refresh, with the entries in it", async () => {
    const body = parseOutput(
      balanceHistory,
      await (await historyOf(race.blake.id, "1W")).json(),
    );

    // The 120 € of A bought on Monday 9 is no gain; A's rise after it is.
    expect(
      body.points.map(({ balanceEur, gain, provisional }) => [
        balanceEur,
        gain.eur,
        gain.percent,
        provisional,
      ]),
    ).toEqual([
      ["100.00", "0.00", "0.00", false],
      ["100.00", "0.00", "0.00", false],
      ["100.00", "0.00", "0.00", false],
      ["100.00", "0.00", "0.00", false],
      ["220.00", "0.00", "0.00", false],
      ["240.00", "20.00", "17.07", false],
      ["250.00", "30.00", "24.40", true],
    ]);
    expect(body.entries).toEqual([
      expect.objectContaining({
        type: "change",
        quantityDelta: "10",
        quantityAfter: "10",
        share: expect.objectContaining({ id: race.shares.a.id }),
      }),
    ]);
  });

  it("starts a member's points at their first entry", async () => {
    const body = parseOutput(
      balanceHistory,
      await (await historyOf(race.cleo.id, "1W")).json(),
    );

    expect(body.points[0]).toMatchObject({
      at: "2026-11-05T22:59:59.000Z",
      incomplete: true,
    });
    expect(body.entries).toHaveLength(2);
  });

  it("answers no points for a member with no entry, and not_found for a guest", async () => {
    const empty = parseOutput(
      balanceHistory,
      await (await historyOf(race.dana.id, "all")).json(),
    );
    const someGuest = await addSignedIn(server, test.db, auth, "guest");

    expect(empty).toEqual({ points: [], entries: [] });
    await expectError(
      balanceHistory,
      await historyOf(someGuest.id, "1W"),
      "not_found",
    );
  });

  it("gives an anonymous viewer each entry's weight in place of its quantities", async () => {
    const { cookie } = await addSignedIn(server, test.db, auth, "anonymous");
    const body = (await (
      await historyOf(race.blake.id, "1W", cookie)
    ).json()) as PortfolioBalanceHistory;

    expect(body.points[0]).not.toHaveProperty("balanceEur");
    // 10 A at 11 € in a balance of 210 € when Blake bought them.
    expect(body.entries[0]).toMatchObject({
      quantityDelta: "52.38",
      quantityAfter: "52.38",
    });
  });
});
