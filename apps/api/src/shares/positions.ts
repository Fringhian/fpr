import type { Position } from "@fpr/contracts";
import {
  type ChangeAtDayValue,
  currentPositions,
  type Db,
  shareValues,
  valuation,
} from "@fpr/db";
import { Big, money, plain, ratio, toGain } from "../valuation/decimal.js";
import { gainSinceBought, groupChanges } from "../valuation/holding-gains.js";
import { type HoldingNow, holdingsNow } from "../valuation/holdings-now.js";

/** Each person's holding of a share now, with what a position on it needs. */
export interface SharePositions {
  holdings: Map<string, HoldingNow>;
  /** Each person's changes on the share, oldest first, by user id. */
  changes: Map<string, ChangeAtDayValue[]>;
  /** Each person's balance now, by user id. */
  balances: Map<string, Big>;
}

/** Every person's holding of a share now, their changes on it, and their balance. */
export async function sharePositions(
  db: Db,
  shareId: string,
  timeZone: string,
): Promise<SharePositions> {
  const [positions, changes, balances] = await Promise.all([
    currentPositions.listByShare(db, shareId),
    shareValues.changesAtDayValue(db, { shareId }, timeZone),
    valuation.balancesAt(db, { at: new Date(), timeZone }),
  ]);
  const holdings = await holdingsNow(db, positions);
  return {
    holdings: new Map(holdings.map((holding) => [holding.userId, holding])),
    changes: groupChanges(changes, ({ userId }) => userId),
    balances: new Map(
      [...balances].map(([id, { balanceEur }]) => [id, new Big(balanceEur)]),
    ),
  };
}

/**
 * A person's position on a share now: its gain since they bought, or `null`
 * when they hold none.
 */
export function positionOf(
  positions: SharePositions,
  userId: string,
): Position | null {
  const holding = positions.holdings.get(userId);
  if (holding === undefined) {
    return null;
  }
  const { valueEur, value } = holding;
  const balance = positions.balances.get(userId);
  return {
    quantity: plain(holding.quantity),
    valueEur: valueEur === null ? null : money(valueEur),
    weight:
      valueEur === null || balance === undefined
        ? null
        : ratio(valueEur, balance),
    gain:
      value === undefined
        ? null
        : toGain(
            gainSinceBought(
              positions.changes.get(userId) ?? [],
              value.priceEur,
            ),
          ),
  };
}
