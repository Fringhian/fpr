import { apiContract, type Members } from "@fpr/contracts";
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

async function members(role: "guest" | "anonymous") {
  const { cookie } = await addSignedIn(server, test.db, auth, role);
  const response = await apiRequest(server, "/members?period=1D", { cookie });
  expect(response.status).toBe(200);
  return (await response.json()) as Members;
}

describe("GET /members", () => {
  it("lists every member with their first entry, closes, gain, balance and top holdings", async () => {
    const body = parseOutput(apiContract.race.members, await members("guest"));
    const byId = new Map(body.members.map((row) => [row.member.id, row]));

    expect(byId.get(race.alex.id)).toMatchObject({
      firstEntryOn: "2026-11-02",
      measuredFrom: null,
      gain: { eur: "30.00", percent: "14.29" },
      balanceEur: "240.00",
      topHoldings: [{ share: { id: race.shares.a.id }, weight: "64.00" }],
      holdingCount: 1,
    });
    expect(
      byId
        .get(race.alex.id)
        ?.series.map(({ at, provisional }) => [at, provisional]),
    ).toEqual([
      ["2026-11-09T22:59:59.000Z", false],
      ["2026-11-10T22:59:59.000Z", false],
    ]);
    expect(byId.get(race.cleo.id)).toMatchObject({
      incomplete: true,
      topHoldings: [],
      holdingCount: 1,
    });
    expect(byId.get(race.dana.id)).toMatchObject({
      firstEntryOn: null,
      gain: null,
      balanceEur: null,
      series: [],
      topHoldings: [],
      holdingCount: 0,
    });
  });

  it("gives an anonymous viewer percentages without balances", async () => {
    const body = await members("anonymous");
    const alex = body.members.find(({ member }) => member.id === race.alex.id);

    expect(alex?.balanceEur).toBeUndefined();
    expect(alex?.gain).toEqual({ percent: "14.29" });
    expect(alex?.series[1]).not.toHaveProperty("balanceEur");
    expect(alex?.member.displayName).not.toBe("Test member");
  });
});
