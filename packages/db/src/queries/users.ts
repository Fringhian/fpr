import { sql, type Transaction } from "kysely";
import type { Database, Db } from "../database.js";
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

export async function findById(db: Db, id: string): Promise<User | undefined> {
  return db
    .selectFrom("user")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

/**
 * The person with this id, with their row locked until the transaction ends,
 * so a write that reads it first runs after any other write to it.
 */
export async function findByIdForUpdate(
  trx: Transaction<Database>,
  id: string,
): Promise<User | undefined> {
  return trx
    .selectFrom("user")
    .selectAll()
    .where("id", "=", id)
    .forUpdate()
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

export async function countAdmins(db: Db): Promise<number> {
  const { count } = await db
    .selectFrom("user")
    .select((eb) => eb.fn.countAll<string>().as("count"))
    .where("role", "=", "admin")
    .executeTakeFirstOrThrow();
  return Number(count);
}

/** The first key of FPR's advisory lock on people's colours. */
const COLOR_LOCK = 2;

/**
 * Takes the lock on people's colours until the transaction ends. Every write
 * that sets a colour takes it before reading `colorsInUse`, so two people
 * picking the same free colour at once run one after the other, and the
 * second sees the first's colour taken.
 */
export async function lockColors(trx: Transaction<Database>): Promise<void> {
  await sql`select pg_advisory_xact_lock(${COLOR_LOCK}, 0)`.execute(trx);
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
