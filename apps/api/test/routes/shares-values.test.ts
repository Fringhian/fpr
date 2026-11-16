import { apiContract } from "@fpr/contracts";
import { manualPriceEvents, prices as priceRows } from "@fpr/db";
import { createTestDatabase, type TestDatabase } from "@fpr/db/testing";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from "vitest";
import type { Auth } from "../../src/auth/auth.js";
import { apiError } from "../../src/errors.js";
import { createSeriesCache } from "../../src/valuation/series-cache.js";
import { expectError } from "../access-support.js";
import {
  addShare,
  addSignedIn,
  apiRequest,
  createTestAuth,
  createTestPrices,
  parseOutput,
  pseudonymOf,
  serveApp,
  TEST_RACE_TIMEZONE,
  type TestPrices,
  type TestServer,
} from "../test-support.js";

let test: TestDatabase;
let auth: Auth;
let server: TestServer;
let prices: TestPrices;
let clearSeries: MockInstance;

beforeAll(async () => {
  test = await createTestDatabase();
  auth = createTestAuth(test.db);
  prices = createTestPrices();
  const series = createSeriesCache({
    db: test.db,
    timeZone: TEST_RACE_TIMEZONE,
  });
  clearSeries = vi.spyOn(series, "clear");
  server = await serveApp({ db: test.db, auth, prices: prices.prices, series });
});

afterAll(async () => {
  await server.close();
  await test.drop();
});

beforeEach(() => {
  prices.reset();
  clearSeries.mockClear();
});

const { values, valueEvents, addValue, updateValue, deleteValue } =
  apiContract.shares;

const march2 = new Date("2026-03-02T16:30:00Z");
const march3 = new Date("2026-03-03T16:30:00Z");

/** A manual share with two value points, the second edited, by `userId`. */
async function addManualShareWithValues(userId: string) {
  const share = await addShare(test.db, "manual");
  for (const [at, priceEur] of [
    [march2, "41.00"],
    [march3, "40.10"],
  ] as const) {
    await priceRows.upsert(test.db, {
      shareId: share.id,
      at,
      priceEur,
      source: "manual",
      enteredBy: userId,
    });
    await manualPriceEvents.insert(test.db, {
      shareId: share.id,
      at,
      action: "added",
      priceEur,
      previousPriceEur: null,
      userId,
    });
  }
  await manualPriceEvents.insert(test.db, {
    shareId: share.id,
    at: march3,
    action: "edited",
    priceEur: "40.10",
    previousPriceEur: "40.50",
    userId,
  });
  return share;
}

describe("GET /api/shares/:id/values", () => {
  it("lists a manual share's value points, newest first, with who entered each", async () => {
    const member = await addSignedIn(server, test.db, auth, "member");
    const share = await addManualShareWithValues(member.id);

    const response = await apiRequest(server, `/shares/${share.id}/values`, {
      cookie: member.cookie,
    });

    expect(response.status).toBe(200);
    const body = parseOutput(values, await response.json());
    expect(body.values.map(({ at, priceEur }) => [at, priceEur])).toEqual([
      [march3.toISOString(), "40.10"],
      [march2.toISOString(), "41.00"],
    ]);
    expect(body.values[0]?.enteredBy).toMatchObject({
      id: member.id,
      displayName: "Test member",
    });
  });

  it("shows an anonymous viewer the values, with a pseudonym for who entered them", async () => {
    const member = await addSignedIn(server, test.db, auth, "member");
    const viewer = await addSignedIn(server, test.db, auth, "anonymous");
    const share = await addManualShareWithValues(member.id);

    const response = await apiRequest(server, `/shares/${share.id}/values`, {
      cookie: viewer.cookie,
    });

    const body = parseOutput(values, await response.json());
    expect(body.values[0]).toMatchObject({
      priceEur: "40.10",
      enteredBy: {
        id: member.id,
        displayName: await pseudonymOf(test.db, member.id),
      },
    });
  });

  it("answers no values for a market share, and not_found for an unknown one", async () => {
    const guest = await addSignedIn(server, test.db, auth, "guest");
    const market = await addShare(test.db, "market");

    const response = await apiRequest(server, `/shares/${market.id}/values`, {
      cookie: guest.cookie,
    });
    expect(await response.json()).toEqual({ values: [] });

    await expectError(
      values,
      await apiRequest(
        server,
        "/shares/0196a1b2-0000-7000-8000-00000000ffff/values",
        { cookie: guest.cookie },
      ),
      "not_found",
    );
  });
});

describe("GET /api/shares/:id/value-events", () => {
  it("lists a manual share's value edits, newest first, with who made each", async () => {
    const member = await addSignedIn(server, test.db, auth, "member");
    const share = await addManualShareWithValues(member.id);

    const response = await apiRequest(
      server,
      `/shares/${share.id}/value-events`,
      { cookie: member.cookie },
    );

    const { events } = parseOutput(valueEvents, await response.json());
    expect(events.map(({ action }) => action)).toEqual([
      "edited",
      "added",
      "added",
    ]);
    expect(events[0]).toMatchObject({
      at: march3.toISOString(),
      priceEur: "40.10",
      previousPriceEur: "40.50",
      madeBy: { id: member.id, displayName: "Test member" },
    });
  });
});

describe("POST /api/shares/:id/values", () => {
  it("adds a value point entered by the viewer", async () => {
    const member = await addSignedIn(server, test.db, auth, "member");
    const share = await addShare(test.db, "manual");
    prices.routes.addManualPrice = async (input) => ({
      at: input.at,
      priceEur: input.priceEur,
      enteredBy: input.enteredBy,
    });

    const response = await apiRequest(server, `/shares/${share.id}/values`, {
      method: "POST",
      cookie: member.cookie,
      body: { at: march2.toISOString(), priceEur: "41.00" },
    });

    expect(response.status).toBe(201);
    expect(parseOutput(addValue, await response.json())).toMatchObject({
      at: march2.toISOString(),
      priceEur: "41.00",
      enteredBy: { id: member.id },
    });
    expect(prices.requests[0]?.body).toMatchObject({
      enteredBy: member.id,
    });
    expect(clearSeries).toHaveBeenCalledOnce();
  });

  it("refuses guests and anonymous viewers", async () => {
    const share = await addShare(test.db, "manual");
    for (const role of ["guest", "anonymous"] as const) {
      const viewer = await addSignedIn(server, test.db, auth, role);
      const response = await apiRequest(server, `/shares/${share.id}/values`, {
        method: "POST",
        cookie: viewer.cookie,
        body: { at: march2.toISOString(), priceEur: "41.00" },
      });
      await expectError(addValue, response, "forbidden");
    }
  });
});

describe("PATCH and DELETE /api/shares/:id/values/:at", () => {
  const path = (shareId: string) =>
    `/shares/${shareId}/values/${encodeURIComponent("2026-03-02T17:30:00+01:00")}`;

  it("edits a value point, sending the value the editor saw", async () => {
    const member = await addSignedIn(server, test.db, auth, "member");
    const share = await addShare(test.db, "manual");
    prices.routes.updateManualPrice = async (input) => ({
      at: new Date(input.at).toISOString(),
      priceEur: input.priceEur,
      enteredBy: input.enteredBy,
    });

    const response = await apiRequest(server, path(share.id), {
      method: "PATCH",
      cookie: member.cookie,
      body: { priceEur: "42.00", expectedPriceEur: "41.00" },
    });

    expect(response.status).toBe(200);
    expect(parseOutput(updateValue, await response.json())).toMatchObject({
      at: march2.toISOString(),
      priceEur: "42.00",
    });
    expect(prices.requests[0]).toMatchObject({
      method: "PATCH",
      body: {
        priceEur: "42.00",
        expectedPriceEur: "41.00",
        enteredBy: member.id,
      },
    });
    expect(clearSeries).toHaveBeenCalledOnce();
  });

  it("refuses a stale expected value with the stored one and who entered it", async () => {
    const member = await addSignedIn(server, test.db, auth, "member");
    const admin = await addSignedIn(server, test.db, auth, "admin");
    const share = await addShare(test.db, "manual");
    await priceRows.upsert(test.db, {
      shareId: share.id,
      at: march2,
      priceEur: "40.50",
      source: "manual",
      enteredBy: admin.id,
    });
    const details = {
      priceEur: "40.50",
      changedBy: { id: admin.id, displayName: "Test admin" },
    };
    prices.routes.updateManualPrice = async () => {
      throw apiError("value_changed", { priceEur: "40.50" });
    };
    prices.routes.deleteManualPrice = async () => {
      throw apiError("value_changed", { priceEur: "40.50" });
    };

    const patched = await apiRequest(server, path(share.id), {
      method: "PATCH",
      cookie: member.cookie,
      body: { priceEur: "42.00", expectedPriceEur: "41.00" },
    });
    await expectError(updateValue, patched, "value_changed", details);
    const deleted = await apiRequest(server, path(share.id), {
      method: "DELETE",
      cookie: member.cookie,
      body: { expectedPriceEur: "41.00" },
    });
    await expectError(deleteValue, deleted, "value_changed", details);
    expect(clearSeries).not.toHaveBeenCalled();
  });

  it("deletes a value point, and refuses the last one", async () => {
    const member = await addSignedIn(server, test.db, auth, "member");
    const share = await addShare(test.db, "manual");
    const remove = () =>
      apiRequest(server, path(share.id), {
        method: "DELETE",
        cookie: member.cookie,
        body: { expectedPriceEur: "41.00" },
      });

    expect((await remove()).status).toBe(204);
    expect(prices.requests[0]?.body).toMatchObject({
      expectedPriceEur: "41.00",
      deletedBy: member.id,
    });
    expect(clearSeries).toHaveBeenCalledOnce();

    prices.routes.deleteManualPrice = async () => {
      throw apiError("last_value_point");
    };
    await expectError(deleteValue, await remove(), "last_value_point");
  });
});
