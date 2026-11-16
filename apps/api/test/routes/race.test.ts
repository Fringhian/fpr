import { apiContract, type Race } from "@fpr/contracts";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Auth } from "../../src/auth/auth.js";
import { addRace, raceSeries } from "../race-support.js";
import {
  addShare,
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

async function readRace(target: TestServer, role: "guest" | "anonymous") {
  const { cookie } = await addSignedIn(target, test.db, auth, role);
  const response = await apiRequest(target, "/race?period=1D", { cookie });
  expect(response.status).toBe(200);
  return (await response.json()) as Race;
}

describe("GET /race", () => {
  it("gives each member's gain at each close, then provisional points at each refresh", async () => {
    const body = parseOutput(
      apiContract.race.race,
      await readRace(server, "guest"),
    );
    const alex = body.members.find(({ member }) => member.id === race.alex.id);

    expect(body).toMatchObject({
      lastCloseOn: "2026-11-10",
      latestPricesAt: "2026-11-11T09:00:00.000Z",
      refreshesRunning: false,
    });
    expect(
      alex?.points.map(({ gain, provisional }) => [gain.eur, provisional]),
    ).toEqual([
      ["0.00", false],
      ["30.00", false],
      ["40.00", true],
    ]);
    expect(body.notStarted.map(({ id }) => id)).toEqual([race.dana.id]);
  });

  it("gives an anonymous viewer the curves in percent", async () => {
    const body = await readRace(server, "anonymous");
    const point = body.members[0]?.points[1];

    expect(point).not.toHaveProperty("balanceEur");
    expect(Object.keys(point?.gain ?? {})).toEqual(["percent"]);
  });

  it("says refreshes are running while today's refresh is recent", async () => {
    const share = await addShare(test.db);
    await test.db
      .insertInto("prices")
      .values({
        shareId: share.id,
        at: new Date(),
        priceEur: "5",
        source: "intraday",
      })
      .execute();
    const live = await serveApp({ db: test.db, auth });
    try {
      expect((await readRace(live, "guest")).refreshesRunning).toBe(true);
    } finally {
      await live.close();
    }
  });
});
