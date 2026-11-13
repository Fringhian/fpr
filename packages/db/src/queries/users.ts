import { sql } from "kysely";
import type { Db } from "../database.js";
import type { NewUser, User, UserUpdate } from "../tables/user.js";

/** The columns a person's row can change after it is created. */
export type UserChanges = Pick<
  UserUpdate,
  | "email"
  | "displayName"
  | "avatarKey"
  | "role"
  | "color"
  | "locale"
  | "onboardedAt"
>;

/** The person with this id. */
export async function findById(db: Db, id: string): Promise<User | undefined> {
  return db
    .selectFrom("user")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

/** The person with this email, whatever its case. */
export async function findByEmail(
  db: Db,
  email: string,
): Promise<User | undefined> {
  return db
    .selectFrom("user")
    .selectAll()
    .where("email", "=", email.toLowerCase())
    .executeTakeFirst();
}

/** Every person, by display name, then by when they were added. */
export async function list(db: Db): Promise<User[]> {
  return db
    .selectFrom("user")
    .selectAll()
    .orderBy("displayName")
    .orderBy("id")
    .execute();
}

/** Adds a person, with their email in lowercase. */
export async function insert(db: Db, user: NewUser): Promise<User> {
  return db
    .insertInto("user")
    .values({ ...user, email: user.email.toLowerCase() })
    .returningAll()
    .executeTakeFirstOrThrow();
}

/**
 * Changes a person's columns and stamps `updatedAt`. Resolves with the
 * changed row, or `undefined` when nobody has this id.
 */
export async function update(
  db: Db,
  id: string,
  changes: UserChanges,
): Promise<User | undefined> {
  const { email } = changes;
  return db
    .updateTable("user")
    .set({
      ...changes,
      ...(email === undefined ? {} : { email: email.toLowerCase() }),
      updatedAt: sql<Date>`now()`,
    })
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

/**
 * Deletes a person with their account, sessions, and every row of theirs.
 * Resolves with whether someone had this id.
 */
export async function remove(db: Db, id: string): Promise<boolean> {
  const { numDeletedRows } = await db
    .deleteFrom("user")
    .where("id", "=", id)
    .executeTakeFirst();
  return numDeletedRows > 0n;
}

/** How many admins there are. */
export async function countAdmins(db: Db): Promise<number> {
  const { count } = await db
    .selectFrom("user")
    .select((eb) => eb.fn.countAll<string>().as("count"))
    .where("role", "=", "admin")
    .executeTakeFirstOrThrow();
  return Number(count);
}

/**
 * The colours people have, each once, in order. With `exceptUserId`, that
 * person's colour counts only if someone else has it too.
 */
export async function colorsInUse(
  db: Db,
  exceptUserId?: string,
): Promise<number[]> {
  let query = db.selectFrom("user").select("color").distinct().orderBy("color");
  if (exceptUserId !== undefined) {
    query = query.where("id", "<>", exceptUserId);
  }
  const rows = await query.execute();
  return rows.map((row) => row.color);
}
