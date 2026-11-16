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

const { holdingAt } = apiContract.portfolio;

const holdingOf = (
  userId: string,
  shareId: string,
  at: string,
  cookie = guest,
) =>
  apiRequest(
    server,
    `/users/${userId}/holdings/${shareId}?at=${encodeURIComponent(at)}`,
    { cookie },
  );

describe("GET /users/{userId}/holdings/{shareId}", () => {
  it("gives the quantity held at the moment, zero before the first change", async () => {
    const quantityAt = async (at: string) =>
      parseOutput(
        holdingAt,
        await (await holdingOf(race.blake.id, race.shares.a.id, at)).json(),
      ).quantity;

    expect(await quantityAt("2026-11-09T08:59:59Z")).toBe("0");
    expect(await quantityAt("2026-11-09T10:00:00+01:00")).toBe("10");
  });

  it("is not_found for an unknown share or a guest", async () => {
    const someGuest = await addSignedIn(server, test.db, auth, "guest");
    const at = "2026-11-10T12:00:00Z";

    await expectError(
      holdingAt,
      await holdingOf(race.alex.id, crypto.randomUUID(), at),
      "not_found",
    );
    await expectError(
      holdingAt,
      await holdingOf(someGuest.id, race.shares.a.id, at),
      "not_found",
    );
  });

  it("gives an anonymous viewer the weight in place of the quantity", async () => {
    const { cookie } = await addSignedIn(server, test.db, auth, "anonymous");

    const response = await holdingOf(
      race.blake.id,
      race.shares.a.id,
      "2026-11-11T09:02:00.000Z",
      cookie,
    );

    expect(await response.json()).toMatchObject({ quantity: "64.00" });
  });
});
