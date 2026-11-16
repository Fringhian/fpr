import { apiContract, type Leaderboard } from "@fpr/contracts";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { Auth } from "../../src/auth/auth.js";
import { addRace, raceSeries } from "../race-support.js";
import {
  addSignedIn,
  apiRequest,
  createTestAuth,
  parseOutput,
  pseudonymOf,
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

async function leaderboard(path: string, cookie = guest) {
  const response = await apiRequest(server, `/leaderboards/${path}`, {
    cookie,
  });
  expect(response.status).toBe(200);
  return parseOutput(apiContract.race.leaderboard, await response.json());
}

describe("GET /leaderboards/{board}", () => {
  it("ranks by balance at the last close, a tie in the order members were added", async () => {
    const board = await leaderboard("balance?period=1D");

    expect(board.board).toBe("balance");
    expect(board.lastCloseOn).toBe("2026-11-10");
    if (board.board !== "balance") {
      return;
    }
    expect(
      board.rows.map(({ member, balanceEur, incomplete }) => [
        member.id,
        balanceEur,
        incomplete,
      ]),
    ).toEqual([
      [race.alex.id, "240.00", false],
      [race.blake.id, "240.00", false],
      [race.cleo.id, "50.00", true],
    ]);
    expect(board.notStarted.map(({ id }) => id)).toEqual([race.dana.id]);
  });

  it("ranks by gain over the period from closes only, each row with its best holding", async () => {
    const board = await leaderboard("gain?period=1D&unit=eur");

    expect(board.board === "gain" && board.unit).toBe("eur");
    if (board.board !== "gain") {
      return;
    }
    expect(
      board.rows.map(({ member, gain, bestHolding }) => [
        member.id,
        gain,
        bestHolding && [bestHolding.share.id, bestHolding.gain.percent],
      ]),
    ).toEqual([
      [
        race.alex.id,
        { eur: "30.00", percent: "14.29" },
        [race.shares.a.id, "25.00"],
      ],
      [
        race.blake.id,
        { eur: "20.00", percent: "9.09" },
        [race.shares.a.id, "25.00"],
      ],
      [race.cleo.id, { eur: "0.00", percent: "0.00" }, null],
    ]);
  });

  it("measures a member who started after the period's start from their first entry", async () => {
    const board = await leaderboard("gain?period=1W&unit=percent");

    if (board.board !== "gain") {
      throw new Error("Expected the gain board");
    }
    const byId = new Map(board.rows.map((row) => [row.member.id, row]));
    expect(byId.get(race.cleo.id)?.measuredFrom).toBe("2026-11-05");
    expect(byId.get(race.alex.id)).toMatchObject({
      measuredFrom: null,
      gain: { eur: "50.00", percent: "26.32" },
    });
  });

  it("ranks an anonymous viewer in percent, without euros or names", async () => {
    const anonymous = await addSignedIn(server, test.db, auth, "anonymous");
    const response = await apiRequest(
      server,
      "/leaderboards/gain?period=1D&unit=eur",
      { cookie: anonymous.cookie },
    );
    const body = (await response.json()) as Extract<
      Leaderboard,
      { board: "gain" }
    >;

    expect(body.unit).toBe("percent");
    expect(body.rows[0]?.gain).toEqual({ percent: "14.29" });
    expect(body.rows[0]?.member.displayName).toBe(
      await pseudonymOf(test.db, race.alex.id),
    );
    expect(JSON.stringify(body)).not.toContain("Test member");
  });

  it("is refused without a session", async () => {
    const response = await apiRequest(server, "/leaderboards/gain?period=1D");

    expect(response.status).toBe(401);
  });
});
