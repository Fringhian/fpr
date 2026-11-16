import {
  type Decimal,
  type PortfolioHoldingAt,
  type PortfolioHoldingAtQuery,
  Role,
} from "@fpr/contracts";
import { type Db, type HoldingAtMoment, shareValues, valuation } from "@fpr/db";
import { toShareSummary } from "../shares/share-summary.js";
import { Big, plain, ratio } from "../valuation/decimal.js";
import type { LogContext } from "./log.js";
import { findOwnerShare } from "./owner.js";

/**
 * The holding's weight in the member's balance at the moment, which replaces
 * its quantity for an anonymous viewer: `0` for none, and `null` while the
 * share has no price or the balance is zero.
 */
async function holdingWeight(
  db: Db,
  userId: string,
  { at, quantity, priceEur }: HoldingAtMoment,
): Promise<Decimal | null> {
  if (new Big(quantity).eq(0)) {
    return "0";
  }
  const balance = (await valuation.balancesAt(db, at)).get(userId);
  return priceEur === null || balance === undefined
    ? null
    : ratio(new Big(quantity).times(priceEur), new Big(balance.balanceEur));
}

/**
 * `GET /users/{userId}/holdings/{shareId}?at=`: the sum of the member's
 * changes on the share up to the moment, zero before the first.
 */
export async function readHoldingAt(
  { db, viewer, quantityWeights }: LogContext,
  input: PortfolioHoldingAtQuery,
): Promise<PortfolioHoldingAt> {
  const share = await findOwnerShare(db, input);
  const [held] = await shareValues.holdingAtMoments(db, {
    userId: input.userId,
    shareId: share.id,
    moments: [new Date(input.at)],
  });
  if (held === undefined) {
    throw new Error("A holding at one moment has one row");
  }
  if (viewer.role === Role.anonymous) {
    const weight = await holdingWeight(db, input.userId, held);
    if (weight !== null) {
      quantityWeights.set(share.id, weight);
    }
  }
  return {
    share: toShareSummary(share),
    at: held.at.toISOString(),
    quantity: plain(new Big(held.quantity)),
  };
}
