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

// A Wednesday: the last trading day is Tuesday 3 March.
const NOW = new Date("2026-03-04T10:00:00+01:00");
const UNKNOWN_ID = "01900000-0000-7000-8000-000000000000";

beforeAll(async () => {
  app = await startTestApp();
});

afterAll(async () => {
  await app.close();
});

afterEach(async () => {
  await app.db.deleteFrom("portfolioChanges").execute();
  await app.db.deleteFrom("shares").execute();
  await app.db.deleteFrom("user").execute();
});

beforeEach(async () => {
  app.now = NOW;
  member = await app.addPerson();
});

const manualBody = (changes: Record<string, unknown> = {}) => ({
  isin: "QZ0EXAMPLE16",
  name: "Example Certificate",
  priceEur: "40.10",
  at: "2026-03-02T05:10:00+01:00",
  createdBy: member,
  ...changes,
});

async function createManual(
  changes: Record<string, unknown> = {},
): Promise<ShareSummary> {
  const { status, body } = await app.call(
    "POST",
    "/shares/manual",
    manualBody(changes),
  );
  expect(status).toBe(201);
  return body as ShareSummary;
}

let isins = 0;
async function insertMarketShare(): Promise<string> {
  isins += 1;
  const row = await app.db
    .insertInto("shares")
    .values({
      isin: `QZ1EXAMPLE${String(isins).padStart(2, "0")}`,
      name: "Example Corp",
      kind: "market",
      tradingCurrency: "USD",
      providerSymbol: `EX${isins}.US`,
      exchange: "US",
      historyStartsOn: null,
      createdBy: null,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
}

async function hold(shareId: string): Promise<void> {
  await app.db
    .insertInto("portfolioChanges")
    .values({
      userId: member,
      shareId,
      quantityDelta: "3",
      effectiveAt: new Date("2026-02-02T10:00:00Z"),
      createdBy: member,
    })
    .execute();
}

async function addPrice(
  shareId: string,
  at: string,
  priceEur: string,
  source: "close" | "intraday",
): Promise<void> {
  await app.db
    .insertInto("prices")
    .values({ shareId, at: new Date(at), priceEur, source })
    .execute();
}

const events = (shareId: string) =>
  app.db
    .selectFrom("manualPriceEvents")
    .select(["at", "action", "priceEur", "previousPriceEur", "userId"])
    .where("shareId", "=", shareId)
    .orderBy("id")
    .execute();

const storedPrices = (shareId: string) =>
  app.db
    .selectFrom("prices")
    .select(["at", "priceEur", "source", "enteredBy"])
    .where("shareId", "=", shareId)
    .orderBy("at")
    .execute();

describe("POST /shares/manual", () => {
  it("answers 500 internal_error without internals on an unexpected failure", async () => {
    // A creator who doesn't exist breaks a foreign key.
    const { status, body } = await app.call(
      "POST",
      "/shares/manual",
      manualBody({ createdBy: UNKNOWN_ID }),
    );
    expect(status).toBe(500);
    expect(body).toEqual({ error: { code: "internal_error" } });
  });

  it("creates the share with its first value point and an added value edit", async () => {
    const share = await createManual({ name: "  Example Certificate " });
    expect(share).toEqual({
      id: expect.any(String),
      isin: "QZ0EXAMPLE16",
      name: "Example Certificate",
      kind: "manual",
      symbol: null,
    });
    const row = await app.db
      .selectFrom("shares")
      .selectAll()
      .where("id", "=", share.id)
      .executeTakeFirstOrThrow();
    expect(row).toMatchObject({ kind: "manual", createdBy: member });
    const at = new Date("2026-03-02T04:10:00Z");
    expect(await storedPrices(share.id)).toEqual([
      { at, priceEur: "40.10", source: "manual", enteredBy: member },
    ]);
    expect(await events(share.id)).toEqual([
      {
        at,
        action: "added",
        priceEur: "40.10",
        previousPriceEur: null,
        userId: member,
      },
    ]);
  });

  it("refuses an invalid body with invalid_request and its issues", async () => {
    const { status, body } = await app.call(
      "POST",
      "/shares/manual",
      manualBody({ isin: "QZ0EXAMPLE", priceEur: 40.1 }),
    );
    expect(status).toBe(400);
    expect(body).toEqual({
      error: {
        code: "invalid_request",
        details: {
          issues: expect.arrayContaining([
            { path: ["isin"], code: "invalid_format" },
            { path: ["priceEur"], code: "invalid_type" },
          ]),
        },
      },
    });
  });

  it("refuses a first value point in the future, and stores nothing", async () => {
    const { status, body } = await app.call(
      "POST",
      "/shares/manual",
      manualBody({ at: "2026-03-04T10:00:01+01:00" }),
    );
    expect(status).toBe(422);
    expect(body).toEqual({ error: { code: "future_moment" } });
    expect(await app.db.selectFrom("shares").selectAll().execute()).toEqual([]);
  });

  it("refuses an ISIN another share has, with that share in details", async () => {
    const first = await createManual();
    const { status, body } = await app.call(
      "POST",
      "/shares/manual",
      manualBody({ name: "Another" }),
    );
    expect(status).toBe(409);
    expect(body).toEqual({
      error: { code: "isin_taken", details: { shareId: first.id } },
    });
  });

  it("creates one share when two members create the same ISIN at once", async () => {
    const answers = await Promise.all(
      [1, 2, 3].map(() => app.call("POST", "/shares/manual", manualBody())),
    );
    const statuses = answers.map(({ status }) => status).sort();
    expect(statuses).toEqual([201, 409, 409]);
    const created = answers.find(({ status }) => status === 201)
      ?.body as ShareSummary;
    for (const { status, body } of answers) {
      if (status === 409) {
        expect(body).toEqual({
          error: { code: "isin_taken", details: { shareId: created.id } },
        });
      }
    }
    expect(
      await app.db.selectFrom("prices").selectAll().execute(),
    ).toHaveLength(1);
    expect(
      await app.db.selectFrom("manualPriceEvents").selectAll().execute(),
    ).toHaveLength(1);
  });
});

describe("PATCH /shares/:id", () => {
  it("changes a manual share's name, ISIN, or both", async () => {
    const share = await createManual();
    const renamed = await app.call("PATCH", `/shares/${share.id}`, {
      name: " Example Fund ",
    });
    expect(renamed).toEqual({
      status: 200,
      body: { ...share, name: "Example Fund" },
    });
    const moved = await app.call("PATCH", `/shares/${share.id}`, {
      isin: "QZ0EXAMPLE24",
    });
    expect(moved.body).toEqual({
      ...share,
      name: "Example Fund",
      isin: "QZ0EXAMPLE24",
    });
    const both = await app.call("PATCH", `/shares/${share.id}`, {
      name: "Example Note",
      isin: "QZ0EXAMPLE24",
    });
    expect(both.body).toEqual({
      ...share,
      name: "Example Note",
      isin: "QZ0EXAMPLE24",
    });
  });

  it("refuses an ISIN another share has, with that share in details", async () => {
    const first = await createManual();
    const second = await createManual({ isin: "QZ0EXAMPLE24" });
    const { status, body } = await app.call("PATCH", `/shares/${second.id}`, {
      isin: first.isin,
      name: "Renamed",
    });
    expect(status).toBe(409);
    expect(body).toEqual({
      error: { code: "isin_taken", details: { shareId: first.id } },
    });
    const row = await app.db
      .selectFrom("shares")
      .select(["isin", "name"])
      .where("id", "=", second.id)
      .executeTakeFirstOrThrow();
    expect(row).toEqual({ isin: "QZ0EXAMPLE24", name: "Example Certificate" });
  });

  it("answers not_found for a market share and a missing share", async () => {
    const market = await insertMarketShare();
    for (const id of [market, UNKNOWN_ID]) {
      const { status, body } = await app.call("PATCH", `/shares/${id}`, {
        name: "Renamed",
      });
      expect(status).toBe(404);
      expect(body).toEqual({ error: { code: "not_found" } });
    }
  });
});

describe("DELETE /shares/:id", () => {
  it("deletes a share with its prices and value edits", async () => {
    const share = await createManual();
    const { status } = await app.call("DELETE", `/shares/${share.id}`);
    expect(status).toBe(200);
    expect(await app.db.selectFrom("shares").selectAll().execute()).toEqual([]);
    expect(await app.db.selectFrom("prices").selectAll().execute()).toEqual([]);
    expect(
      await app.db.selectFrom("manualPriceEvents").selectAll().execute(),
    ).toEqual([]);
  });

  it("refuses a share a share change refers to with share_in_use", async () => {
    const share = await insertMarketShare();
    await hold(share);
    // A change that sold everything still refers to the share.
    await app.db
      .insertInto("portfolioChanges")
      .values({
        userId: member,
        shareId: share,
        quantityDelta: "-3",
        effectiveAt: new Date("2026-02-03T10:00:00Z"),
        createdBy: member,
      })
      .execute();
    const { status, body } = await app.call("DELETE", `/shares/${share}`);
    expect(status).toBe(409);
    expect(body).toEqual({ error: { code: "share_in_use" } });
    expect(
      await app.db.selectFrom("shares").selectAll().execute(),
    ).toHaveLength(1);
  });

  it("answers not_found for a missing share", async () => {
    const { status, body } = await app.call("DELETE", `/shares/${UNKNOWN_ID}`);
    expect(status).toBe(404);
    expect(body).toEqual({ error: { code: "not_found" } });
  });
});

describe("POST /shares/:id/make-manual", () => {
  it("turns a share whose latest close is 6 trading days old manual, keeping its prices", async () => {
    const share = await insertMarketShare();
    await hold(share);
    // The last trading day is Tuesday 3 March. Tuesday 24 February is the
    // sixth trading day back.
    await addPrice(share, "2026-02-23T22:59:59Z", "38", "close");
    await addPrice(share, "2026-02-24T22:59:59Z", "39", "close");
    await addPrice(share, "2026-03-02T15:00:00Z", "39.50", "intraday");

    const { status, body } = await app.call(
      "POST",
      `/shares/${share}/make-manual`,
      { enteredBy: member },
    );

    expect(status).toBe(200);
    expect(body).toMatchObject({ id: share, kind: "manual", symbol: null });
    const row = await app.db
      .selectFrom("shares")
      .selectAll()
      .where("id", "=", share)
      .executeTakeFirstOrThrow();
    expect(row).toMatchObject({
      kind: "manual",
      tradingCurrency: null,
      providerSymbol: null,
      exchange: null,
    });
    const latest = new Date("2026-03-02T15:00:00Z");
    expect(await storedPrices(share)).toEqual([
      {
        at: new Date("2026-02-23T22:59:59Z"),
        priceEur: "38",
        source: "close",
        enteredBy: null,
      },
      {
        at: new Date("2026-02-24T22:59:59Z"),
        priceEur: "39",
        source: "close",
        enteredBy: null,
      },
      { at: latest, priceEur: "39.50", source: "manual", enteredBy: member },
    ]);
    expect(await events(share)).toEqual([
      {
        at: latest,
        action: "added",
        priceEur: "39.50",
        previousPriceEur: null,
        userId: member,
      },
    ]);
  });

  it("takes a first value point for a held share with no price", async () => {
    const share = await insertMarketShare();
    await hold(share);

    const missing = await app.call("POST", `/shares/${share}/make-manual`, {
      enteredBy: member,
    });
    expect(missing.status).toBe(400);
    expect(missing.body).toEqual({
      error: {
        code: "invalid_request",
        details: {
          issues: [
            { path: ["priceEur"], code: "invalid_type" },
            { path: ["at"], code: "invalid_type" },
          ],
        },
      },
    });

    const future = await app.call("POST", `/shares/${share}/make-manual`, {
      enteredBy: member,
      priceEur: "12.50",
      at: "2026-03-05T00:00:00+01:00",
    });
    expect(future.status).toBe(422);
    expect(future.body).toEqual({ error: { code: "future_moment" } });

    const made = await app.call("POST", `/shares/${share}/make-manual`, {
      enteredBy: member,
      priceEur: "12.50",
      at: "2026-03-02T17:30:00+01:00",
    });
    expect(made.status).toBe(200);
    expect(made.body).toMatchObject({ kind: "manual" });
    const at = new Date("2026-03-02T16:30:00Z");
    expect(await storedPrices(share)).toEqual([
      { at, priceEur: "12.50", source: "manual", enteredBy: member },
    ]);
    expect(await events(share)).toEqual([
      {
        at,
        action: "added",
        priceEur: "12.50",
        previousPriceEur: null,
        userId: member,
      },
    ]);
  });

  it("refuses a market share that doesn't need attention", async () => {
    const fresh = await insertMarketShare();
    await hold(fresh);
    await addPrice(fresh, "2026-03-03T22:59:59Z", "40", "close");
    const notHeld = await insertMarketShare();
    const manual = await createManual();

    for (const id of [fresh, notHeld, manual.id]) {
      const { status, body } = await app.call(
        "POST",
        `/shares/${id}/make-manual`,
        { enteredBy: member, priceEur: "12.50", at: "2026-03-02T17:30:00Z" },
      );
      expect(status).toBe(409);
      expect(body).toEqual({ error: { code: "share_not_needing_attention" } });
    }
    expect(await events(fresh)).toEqual([]);
  });

  it("refuses a fund whose latest close is 2 trading days old", async () => {
    const fund = await insertMarketShare();
    await hold(fund);
    // The last trading day is Tuesday 3 March; the fund's latest close is
    // Monday's.
    await addPrice(fund, "2026-03-02T22:59:59Z", "40", "close");
    const { status, body } = await app.call(
      "POST",
      `/shares/${fund}/make-manual`,
      { enteredBy: member },
    );
    expect(status).toBe(409);
    expect(body).toEqual({ error: { code: "share_not_needing_attention" } });
  });

  it("refuses a share with no close on a Monday holiday", async () => {
    // Tuesday 10 March at 08:00: the last trading day is Monday 9 March, a
    // holiday with no close. The latest close is Friday's.
    app.now = new Date("2026-03-10T08:00:00+01:00");
    const share = await insertMarketShare();
    await hold(share);
    await addPrice(share, "2026-03-06T22:59:59Z", "40", "close");
    const { status, body } = await app.call(
      "POST",
      `/shares/${share}/make-manual`,
      { enteredBy: member },
    );
    expect(status).toBe(409);
    expect(body).toEqual({ error: { code: "share_not_needing_attention" } });
  });

  it("answers not_found for a missing share", async () => {
    const { status, body } = await app.call(
      "POST",
      `/shares/${UNKNOWN_ID}/make-manual`,
      { enteredBy: member },
    );
    expect(status).toBe(404);
    expect(body).toEqual({ error: { code: "not_found" } });
  });
});
