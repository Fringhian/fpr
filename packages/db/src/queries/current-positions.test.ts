import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../database.js";
import { createTestDatabase, type TestDatabase } from "../testing.js";
import { listAll, listByShare, listByUser } from "./current-positions.js";

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
  db
    .insertInto("portfolioChanges")
    .values({ userId, shareId, quantityDelta, effectiveAt, createdBy: null })
    .execute();

describe("current positions", () => {
  it("list holdings above zero by person, by share, and all", async () => {
    const alex = await insertPerson();
    const sam = await insertPerson();
    const fund = await insertShare();
    const sold = await insertShare();
    await change(alex, fund, "10", DAY_1);
    await change(alex, sold, "4", DAY_1);
    await change(alex, sold, "-4", DAY_2);
    await change(sam, fund, "2.5", DAY_1);

    expect(await listByUser(db, alex)).toEqual([
      { userId: alex, shareId: fund, quantity: "10" },
    ]);
    expect(await listByShare(db, sold)).toEqual([]);
    const holders = await listByShare(db, fund);
    expect(holders.map((row) => row.quantity).sort()).toEqual(["10", "2.5"]);
    expect(await listAll(db)).toHaveLength(2);
  });

  it("are empty with no changes", async () => {
    expect(await listByUser(db, await insertPerson())).toEqual([]);
    expect(await listAll(db)).toEqual([]);
  });
});
