import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../../src/database.js";
import {
  colorsInUse,
  findByEmail,
  insert,
  update,
} from "../../src/queries/users.js";
import type { NewUser } from "../../src/tables/user.js";
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

const person = (changes: Partial<NewUser> = {}): NewUser => ({
  email: "alex@example.com",
  displayName: "Alex",
  avatarKey: null,
  role: "member",
  color: 1,
  locale: null,
  onboardedAt: null,
  ...changes,
});

describe("email", () => {
  it("is stored in lowercase and found whatever its case", async () => {
    const row = await insert(db, person({ email: "Alex@Example.com" }));
    expect(row.email).toBe("alex@example.com");
    expect(await findByEmail(db, "ALEX@example.com")).toEqual(row);

    const changed = await update(db, row.id, { email: "Sam@Example.com" });
    expect(changed?.email).toBe("sam@example.com");
  });
});

describe("colorsInUse", () => {
  it("lists each colour once, leaving out a person's own unless someone else has it", async () => {
    const a = await insert(db, person({ email: "a@example.com", color: 5 }));
    await insert(db, person({ email: "b@example.com", color: 2 }));
    expect(await colorsInUse(db)).toEqual([2, 5]);
    expect(await colorsInUse(db, a.id)).toEqual([2]);

    await insert(db, person({ email: "c@example.com", color: 5 }));
    expect(await colorsInUse(db)).toEqual([2, 5]);
    expect(await colorsInUse(db, a.id)).toEqual([2, 5]);
  });
});
