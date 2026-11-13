// Better Auth's CLI reads this file to print the SQL that brings the database
// at DATABASE_URL to Better Auth's schema: `pnpm --filter @fpr/api
// auth:schema`. On an empty database, that is the whole schema.
import { existsSync } from "node:fs";
import { createDb } from "@fpr/db";
import { createAuth } from "./src/auth.ts";

// DATABASE_URL comes from the environment, or else from the root .env.
const rootEnv = new URL("../../.env", import.meta.url);
if (existsSync(rootEnv)) {
  process.loadEnvFile(rootEnv);
}

export const auth = createAuth({
  db: createDb(),
  secret: "only-used-to-generate-the-schema",
  baseURL: "http://localhost",
});
