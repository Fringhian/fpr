import { sql } from "kysely";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import type { Db } from "../database.js";
import type { NewUser } from "../tables/user.js";
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

const HOUR_MS = 60 * 60 * 1000;

const insertPerson = async (changes: Partial<NewUser> = {}) => {
  const row = await db
    .insertInto("user")
    .values({
      email: "alex@example.com",
      displayName: "Alex",
      avatarKey: null,
      role: "member",
      color: 1,
      locale: null,
      onboardedAt: null,
      ...changes,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  return row.id;
};

const insertAccessKey = (
  userId: string,
  codeHash = "access",
  createdBy?: string,
) =>
  db
    .insertInto("accessKeys")
    .values({
      userId,
      codeHash,
      claimedAt: null,
      accessUntil: null,
      revokedAt: null,
      createdBy: createdBy ?? null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

const insertResetKey = (
  userId: string,
  codeHash = "reset",
  createdBy?: string,
) =>
  db
    .insertInto("resetKeys")
    .values({
      userId,
      codeHash,
      usedAt: null,
      revokedAt: null,
      createdBy: createdBy ?? null,
    })
    .returningAll()
    .executeTakeFirstOrThrow();

describe("access_keys", () => {
  it("gets a version 7 uuid, created_at, and claim_before 7 days ahead", async () => {
    const row = await insertAccessKey(await insertPerson());
    expect(row.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.claimBefore.getTime() - row.createdAt.getTime()).toBe(
      7 * 24 * HOUR_MS,
    );
  });

  it("refuses a second key with the same hash", async () => {
    const userId = await insertPerson();
    await insertAccessKey(userId);
    await expect(insertAccessKey(userId)).rejects.toThrow(
      "access_keys_code_hash_key",
    );
  });

  it("refuses a key for nobody", async () => {
    await expect(
      insertAccessKey("01900000-0000-7000-8000-000000000000"),
    ).rejects.toThrow("access_keys_user_id_fkey");
  });

  it("go with their person, and forget the admin who created them", async () => {
    const admin = await insertPerson({
      email: "admin@example.com",
      role: "admin",
    });
    const person = await insertPerson({ color: 2 });
    await insertAccessKey(admin, "admin's");
    await insertAccessKey(person, "person's", admin);

    await db.deleteFrom("user").where("id", "=", admin).execute();

    const rows = await db.selectFrom("accessKeys").selectAll().execute();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: person, createdBy: null });

    await db.deleteFrom("user").where("id", "=", person).execute();
    expect(await db.selectFrom("accessKeys").selectAll().execute()).toEqual([]);
  });
});

describe("reset_keys", () => {
  it("gets a version 7 uuid, created_at, and expires_at 24 hours ahead", async () => {
    const row = await insertResetKey(await insertPerson());
    expect(row.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(row.createdAt).toBeInstanceOf(Date);
    expect(row.expiresAt.getTime() - row.createdAt.getTime()).toBe(
      24 * HOUR_MS,
    );
  });

  it("refuses a second key with the same hash", async () => {
    const userId = await insertPerson();
    await insertResetKey(userId);
    await expect(insertResetKey(userId)).rejects.toThrow(
      "reset_keys_code_hash_key",
    );
  });

  it("refuses a key for nobody", async () => {
    await expect(
      insertResetKey("01900000-0000-7000-8000-000000000000"),
    ).rejects.toThrow("reset_keys_user_id_fkey");
  });

  it("go with their person, and forget the admin who created them", async () => {
    const admin = await insertPerson({
      email: "admin@example.com",
      role: "admin",
    });
    const person = await insertPerson({ color: 2 });
    await insertResetKey(admin, "admin's");
    await insertResetKey(person, "person's", admin);

    await db.deleteFrom("user").where("id", "=", admin).execute();

    const rows = await db.selectFrom("resetKeys").selectAll().execute();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ userId: person, createdBy: null });

    await db.deleteFrom("user").where("id", "=", person).execute();
    expect(await db.selectFrom("resetKeys").selectAll().execute()).toEqual([]);
  });
});

describe("tables", () => {
  it("each carry created_at", async () => {
    const { rows } = await sql<{ tableName: string }>`
      select table_name from information_schema.columns
      where table_schema = 'public' and column_name = 'created_at'
        and table_name in ('access_keys', 'reset_keys')
      order by table_name
    `.execute(db);
    expect(rows.map((row) => row.tableName)).toEqual([
      "access_keys",
      "reset_keys",
    ]);
  });

  it("index user_id and created_by on both", async () => {
    const { rows } = await sql<{ indexdef: string }>`
      select indexdef from pg_indexes
      where schemaname = 'public'
        and tablename in ('access_keys', 'reset_keys')
      order by indexname
    `.execute(db);
    const definitions = rows.map((row) => row.indexdef);
    for (const table of ["access_keys", "reset_keys"]) {
      for (const column of ["user_id", "created_by", "code_hash"]) {
        expect(definitions).toContainEqual(
          expect.stringMatching(
            new RegExp(`ON public\\.${table} USING btree \\(${column}\\)$`),
          ),
        );
      }
    }
  });
});
