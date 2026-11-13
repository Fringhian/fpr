import { existsSync, readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { defaultClientConditions, defaultServerConditions } from "vite";
import { defineProject } from "vitest/config";

/**
 * The Postgres server database tests create their databases on: the
 * environment's `DATABASE_URL`, or else the root `.env`'s. No other variable
 * of `.env` reaches the tests.
 */
function databaseUrl(): string | undefined {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  const file = new URL("./.env", import.meta.url);
  if (!existsSync(file)) {
    return undefined;
  }
  return parseEnv(readFileSync(file, "utf8")).DATABASE_URL || undefined;
}

const DATABASE_URL = databaseUrl();

export default defineProject({
  resolve: { conditions: ["@fpr/source", ...defaultClientConditions] },
  ssr: { resolve: { conditions: ["@fpr/source", ...defaultServerConditions] } },
  test: { env: DATABASE_URL ? { DATABASE_URL } : {} },
});
