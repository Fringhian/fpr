import type { Db } from "../database.js";
import type {
  ManualPriceEvent,
  NewManualPriceEvent,
} from "../tables/manual-price-event.js";

/** Records a value point added, edited, or deleted on a manual share. */
export async function insert(
  db: Db,
  event: NewManualPriceEvent,
): Promise<ManualPriceEvent> {
  return db
    .insertInto("manualPriceEvents")
    .values(event)
    .returningAll()
    .executeTakeFirstOrThrow();
}

/** A share's value edits, newest first. */
export async function listByShare(
  db: Db,
  shareId: string,
): Promise<ManualPriceEvent[]> {
  return db
    .selectFrom("manualPriceEvents")
    .selectAll()
    .where("shareId", "=", shareId)
    .orderBy("createdAt", "desc")
    .orderBy("id", "desc")
    .execute();
}
