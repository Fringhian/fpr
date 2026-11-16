import { apiContract, type PortfolioHoldingHistory } from "@fpr/contracts";
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

const { holdingHistory } = apiContract.portfolio;

const historyOf = (userId: string, shareId: string, cookie = guest) =>
  apiRequest(server, `/users/${userId}/holdings/${shareId}/history?period=1W`, {
    cookie,
  });

describe("GET /users/{userId}/holdings/{shareId}/history", () => {
  it("gives the holding, its value and weight at each moment of the balance history", async () => {
    const body = parseOutput(
      holdingHistory,
      await (await historyOf(race.blake.id, race.shares.a.id)).json(),
    );

    expect(body.share.id).toBe(race.shares.a.id);
    expect(
      body.points.map(({ quantity, valueEur, weight }) => [
        quantity,
        valueEur,
        weight,
      ]),
    ).toEqual([
      ["0", "0.00", "0.00"],
      ["0", "0.00", "0.00"],
      ["0", "0.00", "0.00"],
      ["0", "0.00", "0.00"],
      ["10", "120.00", "54.55"],
      ["10", "150.00", "62.50"],
      ["10", "160.00", "64.00"],
    ]);
  });

  it("has no value for a share with no price", async () => {
    const body = parseOutput(
      holdingHistory,
      await (await historyOf(race.cleo.id, race.shares.c.id)).json(),
    );

    expect(body.points[0]).toMatchObject({
      quantity: "2",
      valueEur: null,
      weight: null,
    });
  });

  it("is not_found for an unknown share or a guest", async () => {
    const someGuest = await addSignedIn(server, test.db, auth, "guest");

    await expectError(
      holdingHistory,
      await historyOf(race.alex.id, crypto.randomUUID()),
      "not_found",
    );
    await expectError(
      holdingHistory,
      await historyOf(someGuest.id, race.shares.a.id),
      "not_found",
    );
  });

  it("gives an anonymous viewer the weight in place of the quantity", async () => {
    const { cookie } = await addSignedIn(server, test.db, auth, "anonymous");
    const body = (await (
      await historyOf(race.blake.id, race.shares.a.id, cookie)
    ).json()) as PortfolioHoldingHistory;

    expect(body.points.at(-1)).toEqual({
      at: "2026-11-11T09:02:00.000Z",
      quantity: "64.00",
      weight: "64.00",
    });
  });
});
