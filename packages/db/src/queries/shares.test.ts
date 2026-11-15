import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../database.js";
import type { NewShare } from "../tables/share.js";
import { createTestDatabase, type TestDatabase } from "../testing.js";
import {
  findById,
  findByIsin,
  insert,
  lockById,
  needsAttention,
  remove,
  update,
} from "./shares.js";

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

describe("lockById", () => {
  it("finds the share, and none for an unknown id", async () => {
    const row = await insert(db, marketShare());
    await db.transaction().execute(async (trx) => {
      expect(await lockById(trx, row.id)).toEqual(row);
      expect(await lockById(trx, UNKNOWN_ID)).toBeUndefined();
    });
  });

  it("makes a second writer wait until the first transaction ends", async () => {
    const row = await insert(db, marketShare());
    const order: string[] = [];
    let release: () => void = () => undefined;
    const released = new Promise<void>((resolve) => {
      release = resolve;
    });
    let locked: () => void = () => undefined;
    const firstLocked = new Promise<void>((resolve) => {
      locked = resolve;
    });

    const first = db.transaction().execute(async (trx) => {
      await lockById(trx, row.id);
      locked();
      await released;
      await trx
        .updateTable("shares")
        .set({ name: "First" })
        .where("id", "=", row.id)
        .execute();
      order.push("first");
    });
    await firstLocked;
    const second = db.transaction().execute(async (trx) => {
      const share = await lockById(trx, row.id);
      order.push(`second saw ${share?.name}`);
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(order).toEqual([]);
    release();
    await Promise.all([first, second]);
    expect(order).toEqual(["first", "second saw First"]);
  });
});

describe("needsAttention", () => {
  const timeZone = "Europe/Paris";
  const lastTradingDay = "2026-03-03";

  let people = 0;
  /** Records a new person's change on a share, and returns their id. */
  const hold = async (
    shareId: string,
    quantityDelta = "2",
  ): Promise<string> => {
    people += 1;
    const person = await db
      .insertInto("user")
      .values({
        email: `person${people}@example.com`,
        displayName: `Person ${people}`,
        avatarKey: null,
        role: "member",
        color: (people % 10) + 1,
        locale: null,
        onboardedAt: null,
      })
      .returning("id")
      .executeTakeFirstOrThrow();
    await db
      .insertInto("portfolioChanges")
      .values({
        userId: person.id,
        shareId,
        quantityDelta,
        effectiveAt: new Date("2026-03-01T10:00:00Z"),
        createdBy: person.id,
      })
      .execute();
    return person.id;
  };

  const addPrice = async (
    shareId: string,
    at: string,
    source: "close" | "intraday",
  ): Promise<void> => {
    await db
      .insertInto("prices")
      .values({ shareId, at: new Date(at), priceEur: "40", source })
      .execute();
  };

  afterEach(async () => {
    await db.deleteFrom("portfolioChanges").execute();
  });

  it("is true for a held market share with no price yet", async () => {
    const row = await insert(db, marketShare());
    await hold(row.id);
    expect(await needsAttention(db, row.id, lastTradingDay, timeZone)).toBe(
      true,
    );
  });

  it("is true for a held share whose latest close is older than the last trading day", async () => {
    const row = await insert(db, marketShare());
    await hold(row.id);
    // 2 March, 23:59:59 in Paris.
    await addPrice(row.id, "2026-03-02T22:59:59Z", "close");
    // An intraday price doesn't count as a close.
    await addPrice(row.id, "2026-03-04T10:00:00Z", "intraday");
    expect(await needsAttention(db, row.id, lastTradingDay, timeZone)).toBe(
      true,
    );
  });

  it("is false once the close of the last trading day is stored", async () => {
    const row = await insert(db, marketShare());
    await hold(row.id);
    // 3 March, 23:59:59 in Paris.
    await addPrice(row.id, "2026-03-03T22:59:59Z", "close");
    expect(await needsAttention(db, row.id, lastTradingDay, timeZone)).toBe(
      false,
    );
  });

  it("starts the last trading day at midnight in the time zone", async () => {
    const row = await insert(db, marketShare());
    await hold(row.id);
    // 3 March, 00:30 in Paris, still 2 March in UTC.
    await addPrice(row.id, "2026-03-02T23:30:00Z", "close");
    expect(await needsAttention(db, row.id, lastTradingDay, timeZone)).toBe(
      false,
    );
    expect(await needsAttention(db, row.id, lastTradingDay, "UTC")).toBe(true);
  });

  it("is false for a share nobody holds now", async () => {
    const row = await insert(db, marketShare());
    expect(await needsAttention(db, row.id, lastTradingDay, timeZone)).toBe(
      false,
    );
    const person = await hold(row.id, "2");
    await db
      .insertInto("portfolioChanges")
      .values({
        userId: person,
        shareId: row.id,
        quantityDelta: "-2",
        effectiveAt: new Date("2026-03-02T10:00:00Z"),
        createdBy: person,
      })
      .execute();
    expect(await needsAttention(db, row.id, lastTradingDay, timeZone)).toBe(
      false,
    );
  });

  it("is false for a manual share and an unknown id", async () => {
    const row = await insert(
      db,
      marketShare({
        kind: "manual",
        tradingCurrency: null,
        providerSymbol: null,
        exchange: null,
      }),
    );
    await hold(row.id);
    expect(await needsAttention(db, row.id, lastTradingDay, timeZone)).toBe(
      false,
    );
    expect(await needsAttention(db, UNKNOWN_ID, lastTradingDay, timeZone)).toBe(
      false,
    );
  });
});
