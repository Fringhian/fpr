import { CamelCasePlugin, Kysely, PostgresDialect, sql } from "kysely";
import pg from "pg";
import type { AccountTable } from "./tables/account.js";
import type { SessionTable } from "./tables/session.js";
import type { UserTable } from "./tables/user.js";
import type { VerificationTable } from "./tables/verification.js";
import { typeParsers } from "./type-parsers.js";

/**
 * Every table, keyed by its camelCase name, with its row type. Tables are
 * added here with the migration that creates them.
 */
export interface Database {
  user: UserTable;
  account: AccountTable;
  session: SessionTable;
  verification: VerificationTable;
}

export type Db = Kysely<Database>;

export interface CreateDbOptions {
  /** The Postgres connection string. Defaults to `DATABASE_URL`. */
  url?: string;
  /**
   * Receives the error of an idle pooled connection that fails, for example
   * when Postgres restarts. The pool drops that connection and opens a new
   * one on the next query. Defaults to `console.error`.
   */
  onIdleError?: (error: Error) => void;
}

/** How long a query waits for a connection before failing. */
const CONNECTION_TIMEOUT_MS = 5_000;

/**
 * Opens the process's one connection pool. Queries are written in camelCase
 * and reach Postgres in snake_case; rows come back in camelCase.
 */
export function createDb(options: CreateDbOptions = {}): Db {
  const url = options.url ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool = new pg.Pool({
    connectionString: url,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
    types: typeParsers,
  });
  pool.on("error", options.onIdleError ?? ((error) => console.error(error)));

  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool }),
    plugins: [new CamelCasePlugin()],
  });
}

/** Resolves once Postgres answers a query, and rejects otherwise. */
export async function ping(db: Db): Promise<void> {
  await sql`select 1`.execute(db);
}

/** Waits for running queries to finish, then closes every connection. */
export async function close(db: Db): Promise<void> {
  await db.destroy();
}
