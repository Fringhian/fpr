import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../../src/database.js";
import {
  belowZero,
  holdingAt,
  insert,
  lockUser,
} from "../../src/queries/portfolio-changes.js";
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
  await db.deleteFrom("user").execute();
  await db.deleteFrom("shares").execute();
});

const DAY_1 = new Date("2026-03-02T16:30:00Z");
const DAY_2 = new Date("2026-03-03T16:30:00Z");
const DAY_3 = new Date("2026-03-04T16:30:00Z");

let people = 0;
const insertPerson = async (): Promise<string> => {
  people += 1;
  const row = await db
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
  return row.id;
};

let isins = 0;
const insertShare = async (): Promise<string> => {
  isins += 1;
  const row = await db
    .insertInto("shares")
    .values({
      isin: `FR${String(isins).padStart(9, "0")}0`,
      name: "Example Fund",
      kind: "manual",
      tradingCurrency: null,
      providerSymbol: null,
      exchange: null,
      historyStartsOn: null,
      createdBy: null,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
};

const change = (
  userId: string,
  shareId: string,
  quantityDelta: string,
  effectiveAt: Date,
) =>
  insert(db, {
    userId,
    shareId,
    quantityDelta,
    effectiveAt,
    createdBy: userId,
  });

describe("holdingAt", () => {
  it("sums the person's changes of the share up to the moment, included", async () => {
    const userId = await insertPerson();
    const shareId = await insertShare();
    await change(userId, shareId, "10.5", DAY_1);
    await change(userId, shareId, "-2.25", DAY_2);
    await change(userId, await insertShare(), "100", DAY_1);
    await change(await insertPerson(), shareId, "100", DAY_1);

    const holding = (at: Date) => holdingAt(db, userId, shareId, at);
    expect(await holding(new Date("2026-03-01T00:00:00Z"))).toBe("0");
    expect(await holding(DAY_1)).toBe("10.5");
    expect(await holding(DAY_2)).toBe("8.25");
    expect(await holding(DAY_3)).toBe("8.25");
  });
});

describe("belowZero", () => {
  it("finds the first moment a holding goes below zero", async () => {
    const userId = await insertPerson();
    const shareId = await insertShare();
    await change(userId, shareId, "5", DAY_1);
    expect(await belowZero(db, userId, shareId)).toBeUndefined();

    const sale = await change(userId, shareId, "-7", DAY_2);
    await change(userId, shareId, "-1", DAY_3);
    expect(await belowZero(db, userId, shareId)).toEqual({
      at: DAY_2,
      quantityBefore: "5",
      quantityAfter: "-2",
      changeIds: [sale.id],
    });
  });

  it("counts changes at the same moment together", async () => {
    const userId = await insertPerson();
    const shareId = await insertShare();
    await change(userId, shareId, "-3", DAY_1);
    await change(userId, shareId, "3", DAY_1);
    expect(await belowZero(db, userId, shareId)).toBeUndefined();
  });

  it("finds a sale dated before the purchase it needs", async () => {
    const userId = await insertPerson();
    const shareId = await insertShare();
    await change(userId, shareId, "4", DAY_2);
    await change(userId, shareId, "-4", DAY_1);
    expect(await belowZero(db, userId, shareId)).toMatchObject({
      at: DAY_1,
      quantityBefore: "0",
      quantityAfter: "-4",
    });
  });
});

describe("lockUser", () => {
  it("lets one transaction at a time hold a person's lock", async () => {
    const userId = await insertPerson();
    const otherId = await insertPerson();
    const order: string[] = [];
    let releaseFirst: () => void = () => {};
    const firstHolds = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    let firstLocked: () => void = () => {};
    const firstHasLock = new Promise<void>((resolve) => {
      firstLocked = resolve;
    });

    const first = db.transaction().execute(async (trx) => {
      await lockUser(trx, userId);
      order.push("first locked");
      firstLocked();
      await firstHolds;
      order.push("first done");
    });
    await firstHasLock;
    const second = db.transaction().execute(async (trx) => {
      await lockUser(trx, userId);
      order.push("second locked");
    });
    await db.transaction().execute(async (trx) => {
      await lockUser(trx, otherId);
      order.push("other person locked");
    });

    releaseFirst();
    await Promise.all([first, second]);
    expect(order).toEqual([
      "first locked",
      "other person locked",
      "first done",
      "second locked",
    ]);
  });
});
