import { apiContract, type PortfolioHoldingAt } from "@fpr/contracts";
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

const quantityOf = async (
  shareId: string,
  at: string,
  cookie = guest,
): Promise<string> =>
  parseOutput(
    holdingAt,
    await (await holdingOf(race.blake.id, shareId, at, cookie)).json(),
  ).quantity;

describe("GET /users/{userId}/holdings/{shareId}", () => {
  it("gives the quantity held at the moment, the change at that moment included", async () => {
    const body = parseOutput(
      holdingAt,
      await (
        await holdingOf(
          race.blake.id,
          race.shares.a.id,
          "2026-11-09T10:00:00+01:00",
        )
      ).json(),
    );

    expect(body).toEqual({
      share: expect.objectContaining({ id: race.shares.a.id }),
      at: "2026-11-09T09:00:00.000Z",
      quantity: "10",
    });
  });

  it("is zero before the first change and for a share never held", async () => {
    expect(
      await quantityOf(race.shares.a.id, "2026-11-09T09:59:59+01:00"),
    ).toBe("0");
    expect(
      await quantityOf(race.shares.d.id, "2026-11-10T12:00:00+01:00"),
    ).toBe("0");
  });

  it("is read by every role", async () => {
    for (const role of ["admin", "member", "guest", "anonymous"] as const) {
      const { cookie } = await addSignedIn(server, test.db, auth, role);
      const response = await holdingOf(
        race.blake.id,
        race.shares.a.id,
        "2026-11-10T12:00:00+01:00",
        cookie,
      );
      expect(response.status).toBe(200);
    }
  });

  it("gives an anonymous viewer the weight in the balance in place of the quantity", async () => {
    const { cookie } = await addSignedIn(server, test.db, auth, "anonymous");
    const at = "2026-11-10T23:59:59+01:00";
    const body = (await (
      await holdingOf(race.blake.id, race.shares.a.id, at, cookie)
    ).json()) as PortfolioHoldingAt;

    // 10 A at 15 € of a 240 € balance.
    expect(body.quantity).toBe("62.50");
    expect(await quantityOf(race.shares.d.id, at, cookie)).toBe("0");
  });

  it("is not_found for an unknown person or share, or a guest", async () => {
    const someGuest = await addSignedIn(server, test.db, auth, "guest");
    const at = "2026-11-10T12:00:00+01:00";

    for (const [userId, shareId] of [
      [crypto.randomUUID(), race.shares.a.id],
      [race.blake.id, crypto.randomUUID()],
      [someGuest.id, race.shares.a.id],
    ] as const) {
      await expectError(
        holdingAt,
        await holdingOf(userId, shareId, at),
        "not_found",
      );
    }
  });
});
