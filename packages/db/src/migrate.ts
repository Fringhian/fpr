import { type Migration, Migrator } from "kysely/migration";
import type { Db } from "./database.js";
import { migrations as schemaHistory } from "./migrations/index.js";

/**
 * Runs every pending migration, in name order, in one transaction: either
 * all of them apply or none does. Resolves with the names of the migrations
 * it applied, empty when the database was already up to date.
 *
 * A migration whose name sorts before one already applied is refused, so the
 * history stays in one order on every database.
 */
export async function migrateToLatest(
  db: Db,
  migrations: Readonly<Record<string, Migration>> = schemaHistory,
): Promise<string[]> {
  const migrator = new Migrator({
    db,
    provider: { getMigrations: async () => ({ ...migrations }) },
  });
  const { error, results = [] } = await migrator.migrateToLatest();

  if (error !== undefined) {
    const failed = results.find((result) => result.status === "Error");
    const message = failed
      ? `Migration ${failed.migrationName} failed, so no pending migration was applied`
      : "Migrations did not run";
    throw new Error(message, { cause: error });
  }
  return results.map((result) => result.migrationName);
}
