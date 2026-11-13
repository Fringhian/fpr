import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../database.js";
import type { NewUser } from "../tables/user.js";
import { createTestDatabase, type TestDatabase } from "../testing.js";
import {
  colorsInUse,
  countAdmins,
  findByEmail,
  findById,
  insert,
  list,
  remove,
  update,
} from "./users.js";

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

const UNKNOWN_ID = "01900000-0000-7000-8000-000000000000";

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

describe("insert", () => {
  it("adds a person and returns their row", async () => {
    const row = await insert(db, person({ email: "Alex@Example.com" }));
    expect(row).toMatchObject({
      email: "alex@example.com",
      displayName: "Alex",
      role: "member",
      color: 1,
      locale: null,
      avatarKey: null,
      onboardedAt: null,
      emailVerified: false,
    });
    expect(row.createdAt).toBeInstanceOf(Date);
  });
});

describe("findById", () => {
  it("finds a person, and nobody for an unknown id", async () => {
    const row = await insert(db, person());
    expect(await findById(db, row.id)).toEqual(row);
    expect(await findById(db, UNKNOWN_ID)).toBeUndefined();
  });
});

describe("findByEmail", () => {
  it("finds a person whatever the email's case", async () => {
    const row = await insert(db, person());
    expect(await findByEmail(db, "ALEX@example.com")).toEqual(row);
    expect(await findByEmail(db, "sam@example.com")).toBeUndefined();
  });
});

describe("list", () => {
  it("lists everyone by display name", async () => {
    await insert(db, person({ email: "sam@example.com", displayName: "Sam" }));
    await insert(
      db,
      person({ email: "alex@example.com", displayName: "Alex" }),
    );
    await insert(db, person({ email: "kim@example.com", displayName: "Kim" }));
    const names = (await list(db)).map((row) => row.displayName);
    expect(names).toEqual(["Alex", "Kim", "Sam"]);
  });

  it("is empty with nobody", async () => {
    expect(await list(db)).toEqual([]);
  });
});

describe("update", () => {
  it("changes the given columns and stamps updatedAt", async () => {
    const row = await insert(db, person());
    const onboardedAt = new Date("2026-03-03T09:00:00Z");
    const changed = await update(db, row.id, {
      displayName: "Alexandra",
      color: 4,
      locale: "fr",
      onboardedAt,
    });
    expect(changed).toMatchObject({
      displayName: "Alexandra",
      color: 4,
      locale: "fr",
      onboardedAt,
      email: "alex@example.com",
      role: "member",
    });
    expect(changed?.updatedAt.getTime()).toBeGreaterThanOrEqual(
      row.updatedAt.getTime(),
    );
  });

  it("stores a changed email in lowercase", async () => {
    const row = await insert(db, person());
    const changed = await update(db, row.id, { email: "Sam@Example.com" });
    expect(changed?.email).toBe("sam@example.com");
  });

  it("clears a nullable column", async () => {
    const row = await insert(db, person({ locale: "en", avatarKey: "a/b" }));
    const changed = await update(db, row.id, { locale: null, avatarKey: null });
    expect(changed).toMatchObject({ locale: null, avatarKey: null });
  });

  it("returns nothing for an unknown id", async () => {
    expect(await update(db, UNKNOWN_ID, { color: 2 })).toBeUndefined();
  });
});

describe("remove", () => {
  it("deletes a person, and reports whether one was there", async () => {
    const row = await insert(db, person());
    expect(await remove(db, row.id)).toBe(true);
    expect(await findById(db, row.id)).toBeUndefined();
    expect(await remove(db, row.id)).toBe(false);
  });
});

describe("countAdmins", () => {
  it("counts admins only", async () => {
    expect(await countAdmins(db)).toBe(0);
    await insert(db, person({ email: "a@example.com", role: "admin" }));
    await insert(db, person({ email: "b@example.com", role: "admin" }));
    await insert(db, person({ email: "c@example.com", role: "member" }));
    expect(await countAdmins(db)).toBe(2);
  });
});

describe("colorsInUse", () => {
  it("lists each colour once, in order", async () => {
    await insert(db, person({ email: "a@example.com", color: 5 }));
    await insert(db, person({ email: "b@example.com", color: 2 }));
    await insert(db, person({ email: "c@example.com", color: 5 }));
    expect(await colorsInUse(db)).toEqual([2, 5]);
  });

  it("leaves out a person's own colour unless someone else has it", async () => {
    const a = await insert(db, person({ email: "a@example.com", color: 5 }));
    await insert(db, person({ email: "b@example.com", color: 2 }));
    expect(await colorsInUse(db, a.id)).toEqual([2]);
    await insert(db, person({ email: "c@example.com", color: 5 }));
    expect(await colorsInUse(db, a.id)).toEqual([2, 5]);
  });
});
