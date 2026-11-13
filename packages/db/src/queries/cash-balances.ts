import type { Db } from "../database.js";
import type {
  CashBalance,
  CashBalanceUpdate,
  NewCashBalance,
} from "../tables/cash-balance.js";

/** The columns a cash balance can change after it is created. */
export type CashBalanceChanges = Pick<
  CashBalanceUpdate,
  "amountEur" | "effectiveAt"
>;

/** Stores a cash balance, with the client's `id` when it sends one. */
export async function insert(
  db: Db,
  balance: NewCashBalance,
): Promise<CashBalance> {
  return db
    .insertInto("cashBalances")
    .values(balance)
    .returningAll()
    .executeTakeFirstOrThrow();
}

/** The cash balance with this id, whoever it belongs to. */
export async function findById(
  db: Db,
  id: string,
): Promise<CashBalance | undefined> {
  return db
    .selectFrom("cashBalances")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

/**
 * Changes a cash balance's amount or moment. Resolves with the changed row,
 * or `undefined` when nothing has this id.
 */
export async function update(
  db: Db,
  id: string,
  changes: CashBalanceChanges,
): Promise<CashBalance | undefined> {
  const set = Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined),
  ) as CashBalanceChanges;
  if (Object.keys(set).length === 0) {
    return findById(db, id);
  }
  return db
    .updateTable("cashBalances")
    .set(set)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

/** Deletes a cash balance. Resolves with whether one had this id. */
export async function remove(db: Db, id: string): Promise<boolean> {
  const { numDeletedRows } = await db
    .deleteFrom("cashBalances")
    .where("id", "=", id)
    .executeTakeFirst();
  return numDeletedRows > 0n;
}

/**
 * The balance that sets a person's cash at a moment: the latest declared at
 * or before it, or `undefined` when they declared none. Of two balances at the
 * same moment, the one recorded last counts.
 */
export async function latestAt(
  db: Db,
  userId: string,
  at: Date,
): Promise<CashBalance | undefined> {
  return db
    .selectFrom("cashBalances")
    .selectAll()
    .where("userId", "=", userId)
    .where("effectiveAt", "<=", at)
    .orderBy("effectiveAt", "desc")
    .orderBy("createdAt", "desc")
    .orderBy("id", "desc")
    .limit(1)
    .executeTakeFirst();
}
