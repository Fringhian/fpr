import { type Kysely, sql } from "kysely";
import type { Migration } from "kysely/migration";
import { afterEach, describe, expect, it } from "vitest";
import { migrateToLatest } from "./migrate.js";
import { migrations } from "./migrations/index.js";
import { createTestDatabase, type TestDatabase } from "./testing.js";

/** A migration that creates one empty table. */
const createTable = (table: string): Migration => ({
  up: async (db: Kysely<unknown>) => {
    await sql`create table ${sql.id(table)} (id int primary key)`.execute(db);
  },
});

const failing: Migration = {
  up: async (db: Kysely<unknown>) => {
    await sql`select * from no_such_table`.execute(db);
  },
};

async function tableNames(test: TestDatabase): Promise<string[]> {
  const { rows } = await sql<{ tableName: string }>`
    select table_name from information_schema.tables
    where table_schema = 'public' and table_name like 'example_%'
    order by table_name
  `.execute(test.db);
  return rows.map((row) => row.tableName);
}

let test: TestDatabase | undefined;

afterEach(async () => {
  await test?.drop();
  test = undefined;
});

describe("migrations", () => {
  it("are named NNNN_description, numbered in order from 0001", () => {
    const names = Object.keys(migrations);
    names.forEach((name, index) => {
      expect(name).toMatch(/^\d{4}_[a-z0-9_]+$/);
      expect(Number(name.slice(0, 4))).toBe(index + 1);
    });
  });

  it("apply to an empty database", async () => {
    test = await createTestDatabase({ migrations: {} });
    expect(await migrateToLatest(test.db)).toEqual(Object.keys(migrations));
  });
});

describe("migrateToLatest", () => {
  it("applies pending migrations in name order and reports them", async () => {
    test = await createTestDatabase({ migrations: {} });
    const applied = await migrateToLatest(test.db, {
      "0002_second": createTable("example_second"),
      "0001_first": createTable("example_first"),
    });
    expect(applied).toEqual(["0001_first", "0002_second"]);
    expect(await tableNames(test)).toEqual(["example_first", "example_second"]);
  });

  it("applies only what is pending", async () => {
    const first = { "0001_first": createTable("example_first") };
    test = await createTestDatabase({ migrations: first });
    const both = { ...first, "0002_second": createTable("example_second") };
    expect(await migrateToLatest(test.db, both)).toEqual(["0002_second"]);
    expect(await migrateToLatest(test.db, both)).toEqual([]);
  });

  it("applies nothing when one pending migration fails", async () => {
    test = await createTestDatabase({ migrations: {} });
    await expect(
      migrateToLatest(test.db, {
        "0001_first": createTable("example_first"),
        "0002_broken": failing,
      }),
    ).rejects.toThrow(
      "Migration 0002_broken failed, so no pending migration was applied",
    );
    expect(await tableNames(test)).toEqual([]);
  });

  it("refuses a migration that sorts before one already applied", async () => {
    test = await createTestDatabase({
      migrations: { "0002_second": createTable("example_second") },
    });
    await expect(
      migrateToLatest(test.db, {
        "0001_first": createTable("example_first"),
        "0002_second": createTable("example_second"),
      }),
    ).rejects.toThrow("Migrations did not run");
  });
});
