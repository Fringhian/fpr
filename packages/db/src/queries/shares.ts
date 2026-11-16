import { type ExpressionBuilder, sql, type Transaction } from "kysely";
import type { Database, Db } from "../database.js";
import type { PriceSource } from "../tables/price.js";
import type { NewShare, Share, ShareUpdate } from "../tables/share.js";

/** The columns a share's row can change after it is created. */
export type ShareChanges = Pick<
  ShareUpdate,
  | "isin"
  | "name"
  | "kind"
  | "tradingCurrency"
  | "providerSymbol"
  | "exchange"
  | "historyStartsOn"
>;

export async function findById(db: Db, id: string): Promise<Share | undefined> {
  return db
    .selectFrom("shares")
    .selectAll()
    .where("id", "=", id)
    .executeTakeFirst();
}

/**
 * The share with this id, locked until the transaction ends, so writes to the
 * same share and its value points run one after the other.
 */
export async function lockById(
  trx: Transaction<Database>,
  id: string,
): Promise<Share | undefined> {
  return trx
    .selectFrom("shares")
    .selectAll()
    .where("id", "=", id)
    .forUpdate()
    .executeTakeFirst();
}

function isHeld(eb: ExpressionBuilder<Database, "shares">) {
  return eb.exists(
    eb
      .selectFrom("currentPositions")
      .select(sql.lit(1).as("one"))
      .whereRef("currentPositions.shareId", "=", "shares.id"),
  );
}

/**
 * Whether a share needs attention: a market share someone holds with no
 * close from the day `closesSince` onward in `timeZone`, either because it has
 * no price yet or because its latest close is older.
 */
function needsAttentionOf(
  eb: ExpressionBuilder<Database, "shares">,
  closesSince: string,
  timeZone: string,
) {
  return eb.and([
    eb("shares.kind", "=", "market"),
    isHeld(eb),
    eb.not(
      eb.exists(
        eb
          .selectFrom("prices")
          .select(sql.lit(1).as("one"))
          .whereRef("prices.shareId", "=", "shares.id")
          .where("prices.source", "=", "close")
          .where(
            "prices.at",
            ">=",
            sql<Date>`(${closesSince}::date)::timestamp at time zone ${timeZone}`,
          ),
      ),
    ),
  ]);
}

/**
 * Whether a market share needs attention: someone holds it, and it has no
 * close from the day `closesSince` onward in `timeZone`. Callers pass
 * `attentionWindowStart`. `false` for a manual share, a share nobody holds,
 * and an unknown id.
 */
export async function needsAttention(
  db: Db,
  id: string,
  closesSince: string,
  timeZone: string,
): Promise<boolean> {
  const row = await db
    .selectFrom("shares")
    .select((eb) =>
      needsAttentionOf(eb, closesSince, timeZone).as("needsAttention"),
    )
    .where("id", "=", id)
    .executeTakeFirst();
  return row?.needsAttention === true;
}

/** A stored share as the admin area lists it. */
export interface AdminShareRow extends Share {
  /** Its latest price, `null` with none. */
  latestAt: Date | null;
  latestPriceEur: string | null;
  latestSource: PriceSource | null;
  /** Someone holds it now. */
  held: boolean;
  /** See `needsAttention`. */
  needsAttention: boolean;
  /** A share change refers to it, so it can't be deleted. */
  hasShareChanges: boolean;
}

/**
 * Every stored share, by name, with its latest price, whether someone holds
 * it, whether it needs attention from `closesSince` (see `needsAttention`),
 * and whether a share change refers to it.
 */
export async function listForAdmin(
  db: Db,
  closesSince: string,
  timeZone: string,
): Promise<AdminShareRow[]> {
  return (
    db
      .selectFrom("shares")
      .leftJoinLateral(
        (eb) =>
          eb
            .selectFrom("prices")
            .select(["at", "priceEur", "source"])
            .whereRef("prices.shareId", "=", "shares.id")
            .orderBy("at", "desc")
            .limit(1)
            .as("latest"),
        (join) => join.onTrue(),
      )
      .selectAll("shares")
      .select((eb) => [
        "latest.at as latestAt",
        "latest.priceEur as latestPriceEur",
        "latest.source as latestSource",
        isHeld(eb).as("held"),
        needsAttentionOf(eb, closesSince, timeZone).as("needsAttention"),
        eb
          .exists(
            eb
              .selectFrom("portfolioChanges")
              .select(sql.lit(1).as("one"))
              .whereRef("portfolioChanges.shareId", "=", "shares.id"),
          )
          .as("hasShareChanges"),
      ])
      .orderBy("shares.name")
      .orderBy("shares.id")
      // Postgres answers booleans, which Kysely types as `SqlBool`.
      .$castTo<AdminShareRow>()
      .execute()
  );
}

export async function findByIsin(
  db: Db,
  isin: string,
): Promise<Share | undefined> {
  return db
    .selectFrom("shares")
    .selectAll()
    .where("isin", "=", isin)
    .executeTakeFirst();
}

export async function insert(db: Db, share: NewShare): Promise<Share> {
  return db
    .insertInto("shares")
    .values(share)
    .returningAll()
    .executeTakeFirstOrThrow();
}

/** Inserts a share, or resolves with `undefined` when another share has its ISIN. */
export async function insertUnlessIsinTaken(
  db: Db,
  share: NewShare,
): Promise<Share | undefined> {
  return db
    .insertInto("shares")
    .values(share)
    .onConflict((conflict) => conflict.column("isin").doNothing())
    .returningAll()
    .executeTakeFirst();
}

/** The market shares priced on any of these provider symbols. */
export async function listBySymbols(
  db: Db,
  symbols: readonly string[],
): Promise<Share[]> {
  if (symbols.length === 0) {
    return [];
  }
  return db
    .selectFrom("shares")
    .selectAll()
    .where("providerSymbol", "in", symbols)
    .execute();
}

/**
 * The market shares among these ids, locked until the transaction ends, in id
 * order so two writers never wait on each other.
 */
export async function lockMarket(
  trx: Transaction<Database>,
  ids: readonly string[],
): Promise<Share[]> {
  if (ids.length === 0) {
    return [];
  }
  return trx
    .selectFrom("shares")
    .selectAll()
    .where("id", "in", ids)
    .where("kind", "=", "market")
    .orderBy("id")
    .forUpdate()
    .execute();
}

/** A market share someone holds now, with the days its holdings and closes span. */
export interface HeldMarketShare {
  id: string;
  providerSymbol: string;
  tradingCurrency: string;
  historyStartsOn: string | null;
  /** The day of its earliest share change, in the time zone asked for. */
  firstHeldOn: string;
  /** The days of its earliest and latest stored closes, `null` with none. */
  firstCloseOn: string | null;
  lastCloseOn: string | null;
  /**
   * Whether its closes miss its earliest holding: it has no close on or
   * before its first held day, or before `historyStartsOn` when that is later.
   */
  missingCloses: boolean;
}

/**
 * Every market share someone holds now, with the days of its first holding
 * and of its stored closes in `timeZone`. Prices follow holdings: these are
 * the shares the price service fetches.
 */
export async function listHeldMarket(
  db: Db,
  timeZone: string,
): Promise<HeldMarketShare[]> {
  const { rows } = await sql<HeldMarketShare>`
    select
      s.id,
      s.provider_symbol,
      s.trading_currency,
      s.history_starts_on,
      held.first_held_on,
      closes.first_close_on,
      closes.last_close_on,
      coalesce(
        closes.first_close_on
          > greatest(held.first_held_on, s.history_starts_on),
        true
      ) as missing_closes
    from shares s
    cross join lateral (
      select (min(pc.effective_at) at time zone ${timeZone})::date
        as first_held_on
      from portfolio_changes pc
      where pc.share_id = s.id
    ) held
    cross join lateral (
      select
        (min(p.at) at time zone ${timeZone})::date as first_close_on,
        (max(p.at) at time zone ${timeZone})::date as last_close_on
      from prices p
      where p.share_id = s.id and p.source = 'close'
    ) closes
    where s.kind = 'market'
      and exists (
        select 1 from current_positions cp where cp.share_id = s.id
      )
    order by s.id
  `.execute(db);
  return rows;
}

/**
 * Changes a share's columns. Resolves with the changed row, or `undefined`
 * when no share has this id.
 */
export async function update(
  db: Db,
  id: string,
  changes: ShareChanges,
): Promise<Share | undefined> {
  if (Object.values(changes).every((value) => value === undefined)) {
    return findById(db, id);
  }
  return db
    .updateTable("shares")
    .set(changes)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

/**
 * Deletes a share with its prices and value edits. Resolves with whether a
 * share had this id.
 */
export async function remove(db: Db, id: string): Promise<boolean> {
  const { numDeletedRows } = await db
    .deleteFrom("shares")
    .where("id", "=", id)
    .executeTakeFirst();
  return numDeletedRows > 0n;
}
