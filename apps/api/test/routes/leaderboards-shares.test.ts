import { apiContract } from "@fpr/contracts";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Auth } from "../../src/auth/auth.js";
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

describe("GET /leaderboards/shares", () => {
  it("ranks the shares held at the last close by their change, leaving out a share with no price", async () => {
    const { cookie } = await addSignedIn(server, test.db, auth, "anonymous");
    const response = await apiRequest(
      server,
      "/leaderboards/shares?period=1D",
      {
        cookie,
      },
    );
    const body = parseOutput(
      apiContract.race.shareLeaderboard,
      await response.json(),
    );

    expect(body.lastCloseOn).toBe("2026-11-10");
    expect(body.rows.map(({ share, change }) => [share.id, change])).toEqual([
      [race.shares.a.id, { eur: "3.00", percent: "25.00" }],
      [race.shares.b.id, { eur: "-2.00", percent: "-10.00" }],
    ]);
  });

  it("measures `all` from each share's first price", async () => {
    const { cookie } = await addSignedIn(server, test.db, auth, "guest");
    const response = await apiRequest(
      server,
      "/leaderboards/shares?period=all",
      {
        cookie,
      },
    );
    const body = parseOutput(
      apiContract.race.shareLeaderboard,
      await response.json(),
    );

    expect(body.rows.map(({ change }) => change.percent)).toEqual([
      "50.00",
      "-10.00",
    ]);
  });
});
