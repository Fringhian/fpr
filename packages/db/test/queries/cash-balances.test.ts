import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../../src/database.js";
import { insert, latestAt } from "../../src/queries/cash-balances.js";
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

const cash = (userId: string, amountEur: string, effectiveAt: Date) =>
  insert(db, { userId, amountEur, effectiveAt, createdBy: null });

describe("latestAt", () => {
  it("gives the balance in force at a moment", async () => {
    const userId = await insertPerson();
    await cash(userId, "30", DAY_1);
    await cash(userId, "45", DAY_2);
    await cash(await insertPerson(), "1000", DAY_2);

    const amount = async (at: Date) =>
      (await latestAt(db, userId, at))?.amountEur;
    expect(await amount(new Date("2026-03-01T00:00:00Z"))).toBeUndefined();
    expect(await amount(DAY_1)).toBe("30");
    expect(await amount(new Date("2026-03-02T23:00:00Z"))).toBe("30");
    expect(await amount(DAY_3)).toBe("45");
  });

  it("counts the balance recorded last of two at the same moment", async () => {
    const userId = await insertPerson();
    await cash(userId, "30", DAY_1);
    await cash(userId, "45", DAY_1);
    expect((await latestAt(db, userId, DAY_1))?.amountEur).toBe("45");
  });
});
