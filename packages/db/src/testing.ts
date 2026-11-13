import { randomUUID } from "node:crypto";
import type { Migration } from "kysely/migration";
import pg from "pg";
import { close, createDb, type Db } from "./database.js";
import { migrateToLatest } from "./migrate.js";

/** Every test database's name starts with this. */
export const TEST_DATABASE_PREFIX = "fpr_test_";

export interface TestDatabase {
  /** The pool on the test database, migrated to the latest schema. */
  db: Db;
  /** The test database's name. */
  name: string;
  /** Closes the pool and drops the database. */
  drop: () => Promise<void>;
}

export interface CreateTestDatabaseOptions {
  /**
   * A connection string to the Postgres server the test database is created
   * on. Its role needs `CREATEDB`. Defaults to `DATABASE_URL`.
   */
  url?: string;
  /** The schema history to apply. Defaults to FPR's migrations. */
  migrations?: Readonly<Record<string, Migration>>;
}

/**
 * Creates a fresh database for one test file, on the server at `DATABASE_URL`,
 * and migrates it. The database is only the test's: call `drop` in the file's
 * `afterAll`.
 */
export async function createTestDatabase(
  options: CreateTestDatabaseOptions = {},
): Promise<TestDatabase> {
  const serverUrl = options.url ?? process.env.DATABASE_URL;
  if (!serverUrl) {
    throw new Error(
      "Database tests need Postgres: run `pnpm dev:deps` and set DATABASE_URL in .env",
    );
  }

  const name = `${TEST_DATABASE_PREFIX}${randomUUID().replaceAll("-", "")}`;
  await runOnServer(serverUrl, `create database "${name}"`);

  const url = new URL(serverUrl);
  url.pathname = `/${name}`;
  const db = createDb({ url: url.href });
  const drop = async (): Promise<void> => {
    await close(db);
    await runOnServer(
      serverUrl,
      `drop database if exists "${name}" with (force)`,
    );
  };

  try {
    await migrateToLatest(db, options.migrations);
  } catch (error) {
    await drop();
    throw new Error(`Test database ${name} was not migrated, and is dropped`, {
      cause: error,
    });
  }
  return { db, name, drop };
}

/** Runs one statement on its own short-lived connection. */
async function runOnServer(url: string, statement: string): Promise<void> {
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(statement);
  } finally {
    await client.end();
  }
}
