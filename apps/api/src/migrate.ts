import { close, createDb, type Db, migrateToLatest } from "@fpr/db";
import { createLogger } from "./logger.js";

/**
 * Runs every pending migration against `DATABASE_URL`, then exits: `0` when
 * the database is up to date, `1` otherwise. The API image runs it before the
 * server starts, and `pnpm db:migrate` runs it in development.
 */
async function main(): Promise<void> {
  const logger = createLogger();

  let db: Db;
  try {
    db = createDb({
      onIdleError: (error) =>
        logger.error({ err: error }, "idle database connection failed"),
    });
  } catch (error) {
    logger.error({ err: error }, "migrations did not run");
    process.exitCode = 1;
    return;
  }

  try {
    const applied = await migrateToLatest(db);
    for (const migration of applied) {
      logger.info({ migration }, "migration applied");
    }
    logger.info({ applied: applied.length }, "database schema is up to date");
  } catch (error) {
    logger.error({ err: error }, "migrations failed");
    process.exitCode = 1;
  } finally {
    await close(db);
  }
}

await main();
