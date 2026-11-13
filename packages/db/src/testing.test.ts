import { type Kysely, sql } from "kysely";
import type { Migration } from "kysely/migration";
import pg from "pg";
import { describe, expect, it } from "vitest";
import { ping } from "./database.js";
import { createTestDatabase, TEST_DATABASE_PREFIX } from "./testing.js";

async function databaseExists(name: string): Promise<boolean> {
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  try {
    const { rowCount } = await client.query(
      "select 1 from pg_database where datname = $1",
      [name],
    );
    return rowCount === 1;
  } finally {
    await client.end();
  }
}

describe("createTestDatabase", () => {
  it("creates a migrated database, and drop removes it", async () => {
    const test = await createTestDatabase();
    expect(test.name.startsWith(TEST_DATABASE_PREFIX)).toBe(true);
    await ping(test.db);
    const { rows } = await sql<{ name: string }>`
      select current_database() as name
    `.execute(test.db);
    expect(rows[0]?.name).toBe(test.name);
    expect(await databaseExists(test.name)).toBe(true);

    await test.drop();
    expect(await databaseExists(test.name)).toBe(false);
  });

  it("gives each caller its own database", async () => {
    const [a, b] = await Promise.all([
      createTestDatabase(),
      createTestDatabase(),
    ]);
    expect(a.name).not.toBe(b.name);
    await Promise.all([a.drop(), b.drop()]);
  });

  it("drops the database when a migration fails", async () => {
    const broken: Migration = {
      up: async (db: Kysely<unknown>) => {
        await sql`select * from no_such_table`.execute(db);
      },
    };
    const error: unknown = await createTestDatabase({
      migrations: { "0001_broken": broken },
    }).catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(Error);
    const { message, cause } = error as Error;
    expect(cause).toBeInstanceOf(Error);
    expect((cause as Error).message).toContain("Migration 0001_broken failed");
    const name = message.match(/fpr_test_[0-9a-f]+/)?.[0];
    expect(name).toBeDefined();
    expect(await databaseExists(name ?? "")).toBe(false);
  });

  it("asks for DATABASE_URL when it is not set", async () => {
    await expect(createTestDatabase({ url: "" })).rejects.toThrow(
      "Database tests need Postgres",
    );
  });
});
