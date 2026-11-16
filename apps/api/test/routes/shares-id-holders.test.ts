import { apiContract, type ShareHolders } from "@fpr/contracts";
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

beforeAll(async () => {
  test = await createTestDatabase();
  auth = createTestAuth(test.db);
  server = await serveApp({ db: test.db, auth, series: raceSeries(test.db) });
  race = await addRace(test.db, auth);
  // Cleo sells her 2 C: she keeps her changes, with nothing held.
  await test.db
    .insertInto("portfolioChanges")
    .values({
      userId: race.cleo.id,
      shareId: race.shares.c.id,
      quantityDelta: "-2",
      effectiveAt: new Date("2026-11-06T10:00:00+01:00"),
      createdBy: race.cleo.id,
    })
    .execute();
});

afterAll(async () => {
  await server.close();
  await test.drop();
});

async function holders(id: string, role: "guest" | "anonymous") {
  const { cookie } = await addSignedIn(server, test.db, auth, role);
  const response = await apiRequest(server, `/shares/${id}/holders`, {
    cookie,
  });
  expect(response.status).toBe(200);
  return (await response.json()) as ShareHolders;
}

describe("GET /shares/{id}/holders", () => {
  it("gives each member's changes on the share and their position since they bought", async () => {
    const body = parseOutput(
      apiContract.shares.holders,
      await holders(race.shares.a.id, "guest"),
    );

    expect(
      body.holders.map(({ person, quantity, valueEur, gain, changes }) => [
        person.id,
        quantity,
        valueEur,
        gain,
        changes.map(({ quantityDelta }) => quantityDelta),
      ]),
    ).toEqual([
      [
        race.alex.id,
        "10",
        "160.00",
        { eur: "60.00", percent: "60.00" },
        ["10"],
      ],
      [
        race.blake.id,
        "10",
        "160.00",
        { eur: "40.00", percent: "33.33" },
        ["10"],
      ],
    ]);
  });

  it("keeps a member who sold it all, holding zero", async () => {
    const body = parseOutput(
      apiContract.shares.holders,
      await holders(race.shares.c.id, "guest"),
    );

    expect(body.holders).toEqual([
      expect.objectContaining({
        person: expect.objectContaining({ id: race.cleo.id }),
        quantity: "0",
        valueEur: null,
        gain: null,
      }),
    ]);
  });

  it("gives an anonymous viewer pseudonyms and weights, without euros", async () => {
    const body = await holders(race.shares.a.id, "anonymous");
    const [alex, blake] = body.holders;

    expect(alex?.person.displayName).toBe(
      await pseudonymOf(test.db, race.alex.id),
    );
    expect(alex?.quantity).toBe("64.00");
    expect(alex).not.toHaveProperty("valueEur");
    expect(alex?.gain).toEqual({ percent: "60.00" });
    // 10 A at 11 € in Blake's 210 € balance when he bought them.
    expect(blake?.changes[0]?.quantityDelta).toBe("52.38");
  });
});
