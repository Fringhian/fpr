import type { ShareSummary } from "@fpr/contracts";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
} from "vitest";
import { startTestApp, type TestApp } from "../test-app.js";

let app: TestApp;
let member: string;
let other: string;
let share: ShareSummary;

const NOW = new Date("2026-03-04T10:00:00+01:00");
const UNKNOWN_ID = "01900000-0000-7000-8000-000000000000";
/** The first value point's moment: 2026-03-02T04:10:00Z. */
const FIRST_AT = "2026-03-02T05:10:00+01:00";
const SECOND_AT = "2026-03-03T17:30:00+01:00";

beforeAll(async () => {
  app = await startTestApp();
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  app.now = NOW;
  member = await app.addPerson();
  other = await app.addPerson();
  const { status, body } = await app.call("POST", "/shares/manual", {
    isin: "QZ0EXAMPLE16",
    name: "Example Certificate",
    priceEur: "40.10",
    at: FIRST_AT,
    createdBy: member,
  });
  expect(status).toBe(201);
  share = body as ShareSummary;
});

afterEach(async () => {
  await app.db.deleteFrom("shares").execute();
  await app.db.deleteFrom("user").execute();
});

/** A value point's path, with `at` percent-encoded as oRPC's client sends it. */
const pointPath = (at: string, shareId = share.id) =>
  `/shares/${shareId}/manual-prices/${encodeURIComponent(at)}`;

const events = () =>
  app.db
    .selectFrom("manualPriceEvents")
    .select(["at", "action", "priceEur", "previousPriceEur", "userId"])
    .where("shareId", "=", share.id)
    .orderBy("id")
    .execute();

const manualPrices = () =>
  app.db
    .selectFrom("prices")
    .select(["at", "priceEur", "enteredBy"])
    .where("shareId", "=", share.id)
    .where("source", "=", "manual")
    .orderBy("at")
    .execute();

async function addPoint(at = SECOND_AT, priceEur = "41"): Promise<void> {
  const { status } = await app.call(
    "POST",
    `/shares/${share.id}/manual-prices`,
    { at, priceEur, enteredBy: other },
  );
  expect(status).toBe(201);
}

async function insertMarketShare(): Promise<string> {
  const row = await app.db
    .insertInto("shares")
    .values({
      isin: "QZ1EXAMPLE24",
      name: "Example Corp",
      kind: "market",
      tradingCurrency: "USD",
      providerSymbol: "EXC.US",
      exchange: "US",
      historyStartsOn: null,
      createdBy: null,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  await app.db
    .insertInto("prices")
    .values({
      shareId: row.id,
      at: new Date(FIRST_AT),
      priceEur: "40",
      source: "close",
    })
    .execute();
  return row.id;
}

describe("POST /shares/:id/manual-prices", () => {
  it("stores a value point and an added value edit", async () => {
    const { status, body } = await app.call(
      "POST",
      `/shares/${share.id}/manual-prices`,
      { at: SECOND_AT, priceEur: "41.00", enteredBy: other },
    );
    expect(status).toBe(201);
    expect(body).toEqual({
      at: "2026-03-03T16:30:00.000Z",
      priceEur: "41.00",
      enteredBy: other,
    });
    expect(await manualPrices()).toHaveLength(2);
    expect((await events()).at(-1)).toEqual({
      at: new Date(SECOND_AT),
      action: "added",
      priceEur: "41.00",
      previousPriceEur: null,
      userId: other,
    });
  });

  it("refuses a moment that already has a value point, in any offset, with its price", async () => {
    const { status, body } = await app.call(
      "POST",
      `/shares/${share.id}/manual-prices`,
      { at: "2026-03-02T04:10:00Z", priceEur: "42", enteredBy: other },
    );
    expect(status).toBe(409);
    expect(body).toEqual({
      error: { code: "value_changed", details: { priceEur: "40.10" } },
    });
    expect(await events()).toHaveLength(1);
  });

  it("refuses a moment in the future", async () => {
    const { status, body } = await app.call(
      "POST",
      `/shares/${share.id}/manual-prices`,
      { at: "2026-03-04T09:00:01Z", priceEur: "42", enteredBy: other },
    );
    expect(status).toBe(422);
    expect(body).toEqual({ error: { code: "future_moment" } });
  });

  it("answers not_found for a market share and a missing share", async () => {
    const market = await insertMarketShare();
    for (const id of [market, UNKNOWN_ID]) {
      const { status, body } = await app.call(
        "POST",
        `/shares/${id}/manual-prices`,
        { at: SECOND_AT, priceEur: "42", enteredBy: other },
      );
      expect(status).toBe(404);
      expect(body).toEqual({ error: { code: "not_found" } });
    }
  });

  it("refuses a price that isn't above zero", async () => {
    const { status, body } = await app.call(
      "POST",
      `/shares/${share.id}/manual-prices`,
      { at: SECOND_AT, priceEur: "0", enteredBy: other },
    );
    expect(status).toBe(400);
    expect(body).toEqual({
      error: {
        code: "invalid_request",
        details: { issues: [{ path: ["priceEur"], code: "custom" }] },
      },
    });
  });
});

describe("PATCH /shares/:id/manual-prices/:at", () => {
  it("edits the price found by a percent-encoded moment in any offset", async () => {
    for (const at of [FIRST_AT, "2026-03-02T04:10:00Z"]) {
      const current = (await manualPrices())[0]?.priceEur ?? "";
      const { status, body } = await app.call("PATCH", pointPath(at), {
        priceEur: at === FIRST_AT ? "39.90" : "39.80",
        expectedPriceEur: current,
        enteredBy: other,
      });
      expect(status).toBe(200);
      expect(body).toMatchObject({
        at: "2026-03-02T04:10:00.000Z",
        enteredBy: other,
      });
    }
    expect(await manualPrices()).toEqual([
      {
        at: new Date(FIRST_AT),
        priceEur: "39.80",
        enteredBy: other,
      },
    ]);
    expect((await events()).slice(1)).toEqual([
      {
        at: new Date(FIRST_AT),
        action: "edited",
        priceEur: "39.90",
        previousPriceEur: "40.10",
        userId: other,
      },
      {
        at: new Date(FIRST_AT),
        action: "edited",
        priceEur: "39.80",
        previousPriceEur: "39.90",
        userId: other,
      },
    ]);
  });

  it("takes the expected price as a number, whatever its trailing zeros", async () => {
    const { status } = await app.call("PATCH", pointPath(FIRST_AT), {
      priceEur: "39",
      expectedPriceEur: "40.1",
      enteredBy: other,
    });
    expect(status).toBe(200);
  });

  it("refuses an edit made on a price that changed since, with the stored price", async () => {
    const { status, body } = await app.call("PATCH", pointPath(FIRST_AT), {
      priceEur: "39",
      expectedPriceEur: "41",
      enteredBy: other,
    });
    expect(status).toBe(409);
    expect(body).toEqual({
      error: { code: "value_changed", details: { priceEur: "40.10" } },
    });
    expect(await events()).toHaveLength(1);
  });

  it("lets one of two simultaneous edits of the same value point through", async () => {
    const answers = await Promise.all(
      ["38", "37"].map((priceEur) =>
        app.call("PATCH", pointPath(FIRST_AT), {
          priceEur,
          expectedPriceEur: "40.10",
          enteredBy: other,
        }),
      ),
    );
    expect(answers.map(({ status }) => status).sort()).toEqual([200, 409]);
    const stored = (await manualPrices())[0]?.priceEur;
    const refused = answers.find(({ status }) => status === 409);
    expect(refused?.body).toEqual({
      error: { code: "value_changed", details: { priceEur: stored } },
    });
    expect(await events()).toHaveLength(2);
  });

  it("answers not_found for a moment without a value point, a market share, and a missing share", async () => {
    const market = await insertMarketShare();
    for (const path of [
      pointPath(SECOND_AT),
      pointPath(FIRST_AT, market),
      pointPath(FIRST_AT, UNKNOWN_ID),
    ]) {
      const { status, body } = await app.call("PATCH", path, {
        priceEur: "39",
        expectedPriceEur: "40",
        enteredBy: other,
      });
      expect(status).toBe(404);
      expect(body).toEqual({ error: { code: "not_found" } });
    }
  });

  it("refuses a moment without its offset", async () => {
    const { status, body } = await app.call(
      "PATCH",
      pointPath("2026-03-02T05:10:00"),
      { priceEur: "39", expectedPriceEur: "40.10", enteredBy: other },
    );
    expect(status).toBe(400);
    expect(body).toEqual({
      error: {
        code: "invalid_request",
        details: { issues: [{ path: ["at"], code: "invalid_format" }] },
      },
    });
  });
});

describe("DELETE /shares/:id/manual-prices/:at", () => {
  it("deletes a value point and writes a deleted value edit", async () => {
    await addPoint();
    const { status } = await app.call("DELETE", pointPath(SECOND_AT), {
      expectedPriceEur: "41",
      deletedBy: member,
    });
    expect(status).toBe(200);
    expect(await manualPrices()).toHaveLength(1);
    expect((await events()).at(-1)).toEqual({
      at: new Date(SECOND_AT),
      action: "deleted",
      priceEur: null,
      previousPriceEur: "41",
      userId: member,
    });
  });

  it("refuses to delete a manual share's only value point", async () => {
    const { status, body } = await app.call("DELETE", pointPath(FIRST_AT), {
      expectedPriceEur: "40.10",
      deletedBy: member,
    });
    expect(status).toBe(422);
    expect(body).toEqual({ error: { code: "last_value_point" } });
    expect(await manualPrices()).toHaveLength(1);
  });

  it("keeps one value point when two are deleted at once", async () => {
    await addPoint();
    const answers = await Promise.all([
      app.call("DELETE", pointPath(FIRST_AT), {
        expectedPriceEur: "40.10",
        deletedBy: member,
      }),
      app.call("DELETE", pointPath(SECOND_AT), {
        expectedPriceEur: "41",
        deletedBy: other,
      }),
    ]);
    expect(answers.map(({ status }) => status).sort()).toEqual([200, 422]);
    expect(await manualPrices()).toHaveLength(1);
  });

  it("refuses a deletion made on a price that changed since", async () => {
    await addPoint();
    const { status, body } = await app.call("DELETE", pointPath(SECOND_AT), {
      expectedPriceEur: "40",
      deletedBy: member,
    });
    expect(status).toBe(409);
    expect(body).toEqual({
      error: { code: "value_changed", details: { priceEur: "41" } },
    });
  });

  it("answers not_found for a moment without a value point", async () => {
    const { status, body } = await app.call("DELETE", pointPath(SECOND_AT), {
      expectedPriceEur: "40",
      deletedBy: member,
    });
    expect(status).toBe(404);
    expect(body).toEqual({ error: { code: "not_found" } });
  });

  it("refuses a deletion without who deletes it", async () => {
    const { status, body } = await app.call("DELETE", pointPath(FIRST_AT), {
      expectedPriceEur: "40.10",
    });
    expect(status).toBe(400);
    expect(body).toEqual({
      error: {
        code: "invalid_request",
        details: { issues: [{ path: ["deletedBy"], code: "invalid_type" }] },
      },
    });
  });
});
