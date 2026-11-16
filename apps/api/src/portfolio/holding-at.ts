import {
  type PortfolioHoldingAt,
  type PortfolioHoldingAtQuery,
  Role,
} from "@fpr/contracts";
import { shares, shareValues, valuation } from "@fpr/db";
import { apiError } from "../errors.js";
import { toShareSummary } from "../shares/share-summary.js";
import { Big, plain, ratio } from "../valuation/decimal.js";
import type { LogContext } from "./log.js";
import { findPortfolioOwner } from "./owner.js";

/**
 * `GET /users/{userId}/holdings/{shareId}?at=`: the quantity of the share the
 * member held at the moment, zero when none. For an anonymous viewer, its
 * weight in the member's balance at that moment replaces it, or nothing while
 * the share or the balance has no value.
 */
export async function readHoldingAt(
  { db, viewer, quantityWeights }: LogContext,
  input: PortfolioHoldingAtQuery,
): Promise<PortfolioHoldingAt> {
  const at = new Date(input.at);
  const [, share] = await Promise.all([
    findPortfolioOwner(db, input.userId),
    shares.findById(db, input.shareId),
  ]);
  if (share === undefined) {
    throw apiError("not_found");
  }
  const [held] = await shareValues.holdingAtMoments(db, {
    userId: input.userId,
    shareId: share.id,
    moments: [at],
  });
  const quantity = new Big(held?.quantity ?? 0);
  if (viewer.role === Role.anonymous && held?.priceEur != null) {
    const balance = (await valuation.balancesAt(db, at)).get(input.userId);
    const weight =
      balance === undefined
        ? null
        : ratio(quantity.times(held.priceEur), new Big(balance.balanceEur));
    if (weight !== null) {
      quantityWeights.set(share.id, weight);
    }
  }
  return {
    share: toShareSummary(share),
    at: at.toISOString(),
    quantity: plain(quantity),
  };
}
