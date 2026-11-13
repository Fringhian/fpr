import { sql, type Transaction } from "kysely";
import type { Database, Db } from "../database.js";
import type {
  NewPortfolioChange,
  PortfolioChange,
  PortfolioChangeUpdate,
} from "../tables/portfolio-change.js";

/** The columns a share change can change after it is created. */
export type PortfolioChangeChanges = Pick<
  PortfolioChangeUpdate,
  "quantityDelta" | "effectiveAt"
>;

/** The first moment a holding goes below zero. */
export interface BelowZero {
  at: Date;
  /** The quantity held just before that moment, a decimal string. */
  quantityBefore: string;
  /** The quantity held from that moment, a decimal string below zero. */
  quantityAfter: string;
}

/** The first key of FPR's advisory locks on a person's share changes. */
const PORTFOLIO_LOCK = 1;

/**
 * Takes the lock on a person's share changes until the transaction ends, so
 * two writes to the same person's holdings run one after the other.
 */
export async function lockUser(
  trx: Transaction<Database>,
  userId: string,
): Promise<void> {
  await sql`
    select pg_advisory_xact_lock(${PORTFOLIO_LOCK}, hashtext(${userId}))
  `.execute(trx);
}

/** Stores a share change, with the client's `id` when it sends one. */
export async function insert(
  db: Db,
  change: NewPortfolioChange,
): Promise<PortfolioChange> {
  return db
    .insertInto("portfolioChanges")
    .values(change)
    .returningAll()
    .executeTakeFirstOrThrow();
}

/** The share change with this id, whoever it belongs to. */
export async function findById(
  db: Db,
  id: string,
): Promise<PortfolioChange | undefined> {
  return db
    .selectFrom("portfolioChanges")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

/**
 * Changes a share change's quantity or moment. Resolves with the changed row,
 * or `undefined` when nothing has this id.
 */
export async function update(
  db: Db,
  id: string,
  changes: PortfolioChangeChanges,
): Promise<PortfolioChange | undefined> {
  const set = Object.fromEntries(
    Object.entries(changes).filter(([, value]) => value !== undefined),
  ) as PortfolioChangeChanges;
  if (Object.keys(set).length === 0) {
    return findById(db, id);
  }
  return db
    .updateTable("portfolioChanges")
    .set(set)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

/** Deletes a share change. Resolves with whether one had this id. */
export async function remove(db: Db, id: string): Promise<boolean> {
  const { numDeletedRows } = await db
    .deleteFrom("portfolioChanges")
    .where("id", "=", id)
    .executeTakeFirst();
  return numDeletedRows > 0n;
}

/**
 * The quantity of a share a person held at a moment: the sum of their changes
 * up to and including it. A decimal string, `"0"` when they held none.
 */
export async function holdingAt(
  db: Db,
  userId: string,
  shareId: string,
  at: Date,
): Promise<string> {
  const { quantity } = await db
    .selectFrom("portfolioChanges")
    .select(sql<string>`coalesce(sum(quantity_delta), 0)`.as("quantity"))
    .where("userId", "=", userId)
    .where("shareId", "=", shareId)
    .where("effectiveAt", "<=", at)
    .executeTakeFirstOrThrow();
  return quantity;
}

/**
 * The first moment a person's holding of a share goes below zero, or
 * `undefined` when it never does. Changes at the same moment count together.
 */
export async function belowZero(
  db: Db,
  userId: string,
  shareId: string,
): Promise<BelowZero | undefined> {
  const { rows } = await sql<BelowZero>`
    with moments as (
      select effective_at, sum(quantity_delta) as delta
      from portfolio_changes
      where user_id = ${userId} and share_id = ${shareId}
      group by effective_at
    ),
    running as (
      select
        effective_at,
        delta,
        sum(delta) over (order by effective_at) as quantity_after
      from moments
    )
    select
      effective_at as at,
      quantity_after - delta as quantity_before,
      quantity_after
    from running
    where quantity_after < 0
    order by effective_at
    limit 1
  `.execute(db);
  return rows[0];
}
