import type { Db } from "../database.js";
import type { Share } from "../tables/share.js";

/**
 * The shares whose name, ISIN, or provider symbol contains the text, without
 * case, by name. Empty text matches every share.
 */
export async function matching(db: Db, text: string): Promise<Share[]> {
  let query = db.selectFrom("shares").selectAll();
  if (text !== "") {
    const pattern = `%${text.replace(/[\\%_]/g, "\\$&")}%`;
    query = query.where((eb) =>
      eb.or([
        eb("name", "ilike", pattern),
        eb("isin", "ilike", pattern),
        eb("providerSymbol", "ilike", pattern),
      ]),
    );
  }
  return query.orderBy("name").orderBy("id").execute();
}

/** The shares with these ids, by id. */
export async function byIds(
  db: Db,
  ids: readonly string[],
): Promise<Map<string, Share>> {
  if (ids.length === 0) {
    return new Map();
  }
  const rows = await db
    .selectFrom("shares")
    .selectAll()
    .where("id", "in", [...ids])
    .execute();
  return new Map(rows.map((share) => [share.id, share]));
}
