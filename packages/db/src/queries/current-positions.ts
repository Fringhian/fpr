import type { Db } from "../database.js";
import type { CurrentPosition } from "../tables/current-position.js";

/** A person's holdings above zero, one per share. */
export async function listByUser(
  db: Db,
  userId: string,
): Promise<CurrentPosition[]> {
  return db
    .selectFrom("currentPositions")
    .selectAll()
    .where("userId", "=", userId)
    .orderBy("shareId")
    .execute();
}

/** The people holding a share now, one row each. */
export async function listByShare(
  db: Db,
  shareId: string,
): Promise<CurrentPosition[]> {
  return db
    .selectFrom("currentPositions")
    .selectAll()
    .where("shareId", "=", shareId)
    .orderBy("userId")
    .execute();
}

/** Every holding above zero: each share someone holds, and who holds it. */
export async function listAll(db: Db): Promise<CurrentPosition[]> {
  return db
    .selectFrom("currentPositions")
    .selectAll()
    .orderBy("shareId")
    .orderBy("userId")
    .execute();
}
