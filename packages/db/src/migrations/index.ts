import type { Migration } from "kysely/migration";
import { migration as authTables } from "./0001_auth_tables.js";
import { migration as accessKeys } from "./0002_access_keys.js";
import { migration as sharePrices } from "./0003_share_prices.js";

/**
 * The one schema history, in the order it runs. Each migration is a file in
 * this folder named `NNNN_description.ts`, numbered from `0001`, and listed
 * here under that name without its extension. A migration is never edited
 * once it has run anywhere: a change is a new migration.
 */
export const migrations: Readonly<Record<string, Migration>> = {
  "0001_auth_tables": authTables,
  "0002_access_keys": accessKeys,
  "0003_share_prices": sharePrices,
};
