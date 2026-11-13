import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../database.js";
import type { NewShare } from "../tables/share.js";
import { createTestDatabase, type TestDatabase } from "../testing.js";
import { findById, findByIsin, insert, remove, update } from "./shares.js";

let test: TestDatabase;
let db: Db;

beforeAll(async () => {
  test = await createTestDatabase();
  db = test.db;
});

afterAll(async () => {
  await test.drop();
});

afterEach(async () => {
  await db.deleteFrom("shares").execute();
  await db.deleteFrom("user").execute();
});

const UNKNOWN_ID = "01900000-0000-7000-8000-000000000000";

const marketShare = (changes: Partial<NewShare> = {}): NewShare => ({
  isin: "US0000000001",
  name: "Example Corp",
  kind: "market",
  tradingCurrency: "USD",
  providerSymbol: "EXC.US",
  exchange: "US",
  historyStartsOn: null,
  createdBy: null,
  ...changes,
});

describe("insert", () => {
  it("stores a share and returns its row", async () => {
    const row = await insert(db, marketShare());
    expect(row).toMatchObject(marketShare());
    expect(row.createdAt).toBeInstanceOf(Date);
  });
});

describe("findById", () => {
  it("finds a share, and none for an unknown id", async () => {
    const row = await insert(db, marketShare());
    expect(await findById(db, row.id)).toEqual(row);
    expect(await findById(db, UNKNOWN_ID)).toBeUndefined();
  });
});

describe("findByIsin", () => {
  it("finds a share by its ISIN", async () => {
    const row = await insert(db, marketShare());
    expect(await findByIsin(db, "US0000000001")).toEqual(row);
    expect(await findByIsin(db, "US0000000002")).toBeUndefined();
  });
});

describe("update", () => {
  it("changes the given columns", async () => {
    const row = await insert(db, marketShare());
    const changed = await update(db, row.id, {
      historyStartsOn: "2025-11-12",
    });
    expect(changed).toEqual({ ...row, historyStartsOn: "2025-11-12" });
  });

  it("turns a market share into a manual one", async () => {
    const row = await insert(db, marketShare());
    const changed = await update(db, row.id, {
      kind: "manual",
      tradingCurrency: null,
      providerSymbol: null,
      exchange: null,
    });
    expect(changed).toMatchObject({
      kind: "manual",
      tradingCurrency: null,
      providerSymbol: null,
      exchange: null,
    });
  });

  it("refuses a manual share that keeps its listing", async () => {
    const row = await insert(db, marketShare());
    await expect(
      update(db, row.id, {
        kind: "manual",
        providerSymbol: null,
        exchange: null,
      }),
    ).rejects.toThrow("shares_listing_check");
  });

  it("returns the share unchanged when nothing changes", async () => {
    const row = await insert(db, marketShare());
    expect(await update(db, row.id, {})).toEqual(row);
    expect(await update(db, row.id, { name: undefined })).toEqual(row);
  });

  it("returns nothing for an unknown id", async () => {
    expect(await update(db, UNKNOWN_ID, { name: "Renamed" })).toBeUndefined();
    expect(await update(db, UNKNOWN_ID, {})).toBeUndefined();
  });
});

describe("remove", () => {
  it("deletes a share with its prices, and reports whether one was there", async () => {
    const row = await insert(db, marketShare());
    await db
      .insertInto("prices")
      .values({
        shareId: row.id,
        at: new Date("2026-03-02T16:30:00Z"),
        priceEur: "40.10",
        source: "close",
        enteredBy: null,
      })
      .execute();
    expect(await remove(db, row.id)).toBe(true);
    expect(await findById(db, row.id)).toBeUndefined();
    expect(await db.selectFrom("prices").selectAll().execute()).toEqual([]);
    expect(await remove(db, row.id)).toBe(false);
  });
});
