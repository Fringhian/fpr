import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../../src/database.js";
import { insert, lockById, needsAttention } from "../../src/queries/shares.js";
import type { NewShare } from "../../src/tables/share.js";
import { createTestDatabase, type TestDatabase } from "../../src/testing.js";

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
  await db.deleteFrom("portfolioChanges").execute();
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

describe("lockById", () => {
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
  const closesSince = "2026-03-03";
  const check = (id: string, timeZone = "Europe/Paris") =>
    needsAttention(db, id, closesSince, timeZone);

  let people = 0;
  /** Records a new person's change on a share, and returns their id. */
  const hold = async (shareId: string, quantityDelta = "2") => {
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
  ) => {
    await db
      .insertInto("prices")
      .values({ shareId, at: new Date(at), priceEur: "40", source })
      .execute();
  };

  it("is true for a held market share until a close from the day given is stored", async () => {
    const row = await insert(db, marketShare());
    await hold(row.id);
    expect(await check(row.id)).toBe(true);

    // 2 March, 23:59:59 in Paris: older than the day given.
    await addPrice(row.id, "2026-03-02T22:59:59Z", "close");
    // An intraday price doesn't count as a close.
    await addPrice(row.id, "2026-03-04T10:00:00Z", "intraday");
    expect(await check(row.id)).toBe(true);

    // 3 March, 23:59:59 in Paris.
    await addPrice(row.id, "2026-03-03T22:59:59Z", "close");
    expect(await check(row.id)).toBe(false);
  });

  it("starts the day given at midnight in the time zone", async () => {
    const row = await insert(db, marketShare());
    await hold(row.id);
    // 3 March, 00:30 in Paris, still 2 March in UTC.
    await addPrice(row.id, "2026-03-02T23:30:00Z", "close");
    expect(await check(row.id)).toBe(false);
    expect(await check(row.id, "UTC")).toBe(true);
  });

  it("is false for a share nobody holds now, a manual share, and an unknown id", async () => {
    const sold = await insert(db, marketShare());
    const person = await hold(sold.id, "2");
    await db
      .insertInto("portfolioChanges")
      .values({
        userId: person,
        shareId: sold.id,
        quantityDelta: "-2",
        effectiveAt: new Date("2026-03-02T10:00:00Z"),
        createdBy: person,
      })
      .execute();
    expect(await check(sold.id)).toBe(false);

    const manual = await insert(
      db,
      marketShare({
        isin: "FR0000000002",
        kind: "manual",
        tradingCurrency: null,
        providerSymbol: null,
        exchange: null,
      }),
    );
    await hold(manual.id);
    expect(await check(manual.id)).toBe(false);
    expect(await check(UNKNOWN_ID)).toBe(false);
  });
});
