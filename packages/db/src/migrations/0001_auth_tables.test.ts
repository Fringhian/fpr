import { sql } from "kysely";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../database.js";
import type { Locale, NewUser, Role } from "../tables/user.js";
import { createTestDatabase, type TestDatabase } from "../testing.js";

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

const insertPerson = (changes: Partial<NewUser> = {}) =>
  db.insertInto("user").values(person(changes)).returningAll().execute();

describe("user", () => {
  it("gets a version 7 uuid, created_at, and email_verified false", async () => {
    const [row] = await insertPerson();
    expect(row?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(row?.createdAt).toBeInstanceOf(Date);
    expect(row?.updatedAt).toBeInstanceOf(Date);
    expect(row?.emailVerified).toBe(false);
  });

  it("accepts every role and refuses any other", async () => {
    for (const [index, role] of [
      "admin",
      "member",
      "guest",
      "anonymous",
    ].entries()) {
      await insertPerson({
        email: `${role}@example.com`,
        role: role as Role,
        color: index + 1,
      });
    }
    await expect(insertPerson({ role: "owner" as Role })).rejects.toThrow(
      "user_role_check",
    );
  });

  it("keeps display_name between 1 and 40 characters", async () => {
    await insertPerson({ displayName: "A".repeat(40) });
    await expect(
      insertPerson({ email: "b@example.com", displayName: "" }),
    ).rejects.toThrow("user_display_name_check");
    await expect(
      insertPerson({ email: "c@example.com", displayName: "A".repeat(41) }),
    ).rejects.toThrow("user_display_name_check");
  });

  it("counts display_name in characters, not bytes", async () => {
    await insertPerson({ displayName: "é".repeat(40) });
  });

  it("keeps color between 1 and 10", async () => {
    await insertPerson({ email: "a@example.com", color: 1 });
    await insertPerson({ email: "b@example.com", color: 10 });
    await expect(
      insertPerson({ email: "c@example.com", color: 0 }),
    ).rejects.toThrow("user_color_check");
    await expect(
      insertPerson({ email: "d@example.com", color: 11 }),
    ).rejects.toThrow("user_color_check");
  });

  it("accepts fr, en, or no locale, and refuses any other", async () => {
    await insertPerson({ email: "a@example.com", locale: "fr" });
    await insertPerson({ email: "b@example.com", locale: "en" });
    await insertPerson({ email: "c@example.com", locale: null });
    await expect(
      insertPerson({
        email: "d@example.com",
        locale: "de" as Locale,
      }),
    ).rejects.toThrow("user_locale_check");
  });

  it("refuses a second person with the same email", async () => {
    await insertPerson();
    await expect(insertPerson()).rejects.toThrow("user_email_key");
  });
});

describe("account and session", () => {
  it("go with their person", async () => {
    const [row] = await insertPerson();
    const userId = row?.id ?? "";
    const now = new Date();
    await db
      .insertInto("account")
      .values({
        accountId: userId,
        providerId: "credential",
        userId,
        accessToken: null,
        refreshToken: null,
        idToken: null,
        accessTokenExpiresAt: null,
        refreshTokenExpiresAt: null,
        scope: null,
        password: "hash",
        updatedAt: now,
      })
      .execute();
    await db
      .insertInto("session")
      .values({
        expiresAt: now,
        token: "token",
        updatedAt: now,
        ipAddress: null,
        userAgent: null,
        userId,
      })
      .execute();

    await db.deleteFrom("user").where("id", "=", userId).execute();

    expect(await db.selectFrom("account").selectAll().execute()).toEqual([]);
    expect(await db.selectFrom("session").selectAll().execute()).toEqual([]);
  });
});

describe("tables", () => {
  it("each carry created_at", async () => {
    const { rows } = await sql<{ tableName: string }>`
      select table_name from information_schema.columns
      where table_schema = 'public' and column_name = 'created_at'
      order by table_name
    `.execute(db);
    expect(rows.map((row) => row.tableName)).toEqual([
      "account",
      "session",
      "user",
      "verification",
    ]);
  });

  it("index account and session by user_id", async () => {
    const { rows } = await sql<{ tablename: string; indexdef: string }>`
      select tablename, indexdef from pg_indexes
      where schemaname = 'public' and indexdef like '%(user_id)'
      order by tablename
    `.execute(db);
    expect(rows.map((row) => row.tablename)).toEqual(["account", "session"]);
  });
});
