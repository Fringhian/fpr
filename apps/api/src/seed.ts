import { close, createDb, type Db, migrateToLatest } from "@fpr/db";
import { loadEnv } from "./env.js";
import { createLogger } from "./logger.js";
import {
  refuseProduction,
  type SeedResult,
  seedDatabase,
} from "./seed-database.js";

const ROLE_LABELS = {
  admin: "Admin",
  member: "Member",
  guest: "Guest",
  anonymous: "Anonymous",
} as const;

/** The sign-in details, for the developer's terminal only. */
function summary(result: SeedResult): string {
  const lines = result.people.map((person) =>
    [
      ROLE_LABELS[person.role].padEnd(10),
      person.displayName.padEnd(16),
      (person.role === "anonymous" ? "" : person.email).padEnd(22),
      person.accessLink ?? "",
    ]
      .join(" ")
      .trimEnd(),
  );
  return [
    "",
    `Password of every person who has one: ${result.password}`,
    "A link signs the anonymous viewer in, or waits for a new member's first use.",
    "",
    ...lines.map((line) => `  ${line}`),
    "",
    "",
  ].join("\n");
}

/**
 * Runs pending migrations, then fills the empty database at `DATABASE_URL`
 * with invented data, and prints how to sign in. Exits with `1`, writing
 * nothing, when `NODE_ENV` is `production` or the database has people.
 */
async function main(): Promise<void> {
  const logger = createLogger();

  let db: Db;
  let env: ReturnType<typeof loadEnv>;
  try {
    refuseProduction(process.env.NODE_ENV);
    env = loadEnv();
    db = createDb({
      onIdleError: (error) =>
        logger.error({ err: error }, "idle database connection failed"),
    });
  } catch (error) {
    logger.error({ err: error }, "seed did not run");
    process.exitCode = 1;
    return;
  }

  try {
    const applied = await migrateToLatest(db);
    for (const migration of applied) {
      logger.info({ migration }, "migration applied");
    }
    const result = await seedDatabase(db, {
      publicUrl: env.PUBLIC_URL,
      timeZone: env.RACE_TIMEZONE,
    });
    logger.info(result.counts, "development database seeded");
    process.stdout.write(summary(result));
  } catch (error) {
    logger.error({ err: error }, "seed failed");
    process.exitCode = 1;
  } finally {
    await close(db);
  }
}

await main();
