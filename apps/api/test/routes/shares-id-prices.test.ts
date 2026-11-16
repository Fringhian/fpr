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
let anonymous: string;

beforeAll(async () => {
  test = await createTestDatabase();
  auth = createTestAuth(test.db);
  server = await serveApp({ db: test.db, auth, series: raceSeries(test.db) });
  race = await addRace(test.db, auth);
  anonymous = (await addSignedIn(server, test.db, auth, "anonymous")).cookie;
});

afterAll(async () => {
  await server.close();
  await test.drop();
});

async function chart(id: string, range: string) {
  const response = await apiRequest(
    server,
    `/shares/${id}/prices?range=${range}`,
    {
      cookie: anonymous,
    },
  );
  return parseOutput(apiContract.shares.prices, await response.json()).points;
}

describe("GET /shares/{id}/prices", () => {
  it("gives intraday points for 1D, from the price at the range's start", async () => {
    expect(await chart(race.shares.a.id, "1D")).toEqual([
      { at: "2026-11-09T22:59:59.000Z", priceEur: "12" },
      { at: "2026-11-10T22:59:59.000Z", priceEur: "15" },
      { at: "2026-11-11T09:00:00.000Z", priceEur: "16" },
    ]);
  });

  it("gives daily closes otherwise", async () => {
    const points = await chart(race.shares.a.id, "1M");

    expect(points.map(({ priceEur }) => priceEur)).toEqual([
      "10",
      "10",
      "11",
      "11",
      "11",
      "12",
      "15",
    ]);
  });

  it("gives no points for a share nobody has held", async () => {
    expect(await chart(race.shares.d.id, "1W")).toEqual([]);
  });
});
