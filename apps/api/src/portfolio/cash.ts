import type {
  PortfolioCashAt,
  PortfolioCashAtQuery,
  PortfolioCashBalance,
  PortfolioCashInput,
  PortfolioCashUpdate,
} from "@fpr/contracts";
import {
  cashBalances,
  type Db,
  portfolioChanges,
  violatedConstraint,
} from "@fpr/db";
import { apiError } from "../errors.js";
import type { ApiContext } from "../orpc.js";
import { assertMayWriteUser } from "../ownership.js";
import type { Viewer } from "../pipeline/index.js";
import { readCash } from "./entries.js";
import { findPortfolioOwner, pastMoment } from "./owner.js";

type Context = Pick<ApiContext, "db" | "series">;

/**
 * `POST /users/{userId}/cash-balances`: "from this moment, I have €X". It
 * takes the person's lock and reads their role under it, as making a guest
 * takes the same lock to check they have no entries. A request sent twice
 * with its `id` saves once; an `id` another person has is `forbidden`.
 */
export async function setCash(
  { db, series }: Context,
  viewer: Viewer,
  input: PortfolioCashInput,
): Promise<PortfolioCashBalance> {
  assertMayWriteUser(viewer, input.userId);
  const effectiveAt = pastMoment(input.effectiveAt);
  const saved = await db
    .transaction()
    .execute(async (trx) => {
      await portfolioChanges.lockUser(trx, input.userId);
      await findPortfolioOwner(trx, input.userId);
      const stored =
        input.id === undefined
          ? undefined
          : await cashBalances.findById(trx, input.id);
      if (stored !== undefined) {
        if (stored.userId !== input.userId) {
          throw apiError("forbidden");
        }
        return { id: stored.id, created: false };
      }
      const balance = await cashBalances.insert(trx, {
        ...(input.id === undefined ? {} : { id: input.id }),
        userId: input.userId,
        amountEur: input.amountEur,
        effectiveAt,
        createdBy: viewer.id,
      });
      return { id: balance.id, created: true };
    })
    .catch((error: unknown) => {
      // Another person's cash balance took this id in the meantime.
      if (violatedConstraint(error) === "cash_balances_pkey") {
        throw apiError("forbidden");
      }
      throw error;
    });
  if (saved.created) {
    series.clear();
  }
  return readCash(db, input.userId, saved.id);
}

/** A stored cash balance the viewer may write, or `not_found` / `forbidden`. */
async function writableCash(db: Db, viewer: Viewer, id: string) {
  const balance = await cashBalances.findById(db, id);
  if (balance === undefined) {
    throw apiError("not_found");
  }
  assertMayWriteUser(viewer, balance.userId);
  return balance;
}

/** `PATCH /cash-balances/{id}`. */
export async function editCash(
  { db, series }: Context,
  viewer: Viewer,
  input: PortfolioCashUpdate,
): Promise<PortfolioCashBalance> {
  const balance = await writableCash(db, viewer, input.id);
  const updated = await cashBalances.update(db, balance.id, {
    amountEur: input.amountEur,
    effectiveAt:
      input.effectiveAt === undefined
        ? undefined
        : pastMoment(input.effectiveAt),
  });
  if (updated === undefined) {
    throw apiError("not_found");
  }
  series.clear();
  return readCash(db, balance.userId, balance.id);
}

/** `DELETE /cash-balances/{id}`. */
export async function deleteCash(
  { db, series }: Context,
  viewer: Viewer,
  id: string,
): Promise<void> {
  const balance = await writableCash(db, viewer, id);
  if (!(await cashBalances.remove(db, balance.id))) {
    throw apiError("not_found");
  }
  series.clear();
}

/** `GET /users/{userId}/cash-at?at=`: the cash set at or before the moment. */
export async function cashAt(
  db: Db,
  input: PortfolioCashAtQuery,
): Promise<PortfolioCashAt> {
  await findPortfolioOwner(db, input.userId);
  const balance = await cashBalances.latestAt(
    db,
    input.userId,
    new Date(input.at),
  );
  return balance === undefined
    ? null
    : {
        amountEur: balance.amountEur,
        setAt: balance.effectiveAt.toISOString(),
      };
}
