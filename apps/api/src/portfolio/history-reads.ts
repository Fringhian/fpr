import type {
  PortfolioBalanceHistory,
  PortfolioBalanceHistoryQuery,
  PortfolioHoldingHistory,
  PortfolioHoldingHistoryQuery,
} from "@fpr/contracts";
import { portfolioLog, shares, shareValues } from "@fpr/db";
import { apiError } from "../errors.js";
import type { ApiServices } from "../orpc.js";
import { toShareSummary } from "../shares/share-summary.js";
import { Big, money, plain, ratio } from "../valuation/decimal.js";
import {
  raceWindow,
  toSeriesPoints,
  windowPoints,
} from "../valuation/race-window.js";
import { toLogEntry } from "./entries.js";
import { findPortfolioOwner } from "./owner.js";

type ReadServices = Pick<ApiServices, "db" | "series" | "raceTimeZone">;

/**
 * `GET /users/{userId}/balance-history?period=`: the balance at each close of
 * the period, then at each refresh since, with the entries to mark.
 */
export async function readBalanceHistory(
  context: ReadServices,
  input: Required<PortfolioBalanceHistoryQuery>,
): Promise<PortfolioBalanceHistory> {
  await findPortfolioOwner(context.db, input.userId);
  const window = await raceWindow(context, input.period);
  const entries = await portfolioLog.after(
    context.db,
    input.userId,
    window.startAt,
  );
  // TODO(anonymizer): put each entry's weight in `context.quantityWeights`,
  // by entry id, once the anonymizer middleware reads it.
  return {
    points: toSeriesPoints(
      windowPoints(window, input.userId, { closesOnly: false }),
    ),
    entries: entries.map(toLogEntry),
  };
}

/**
 * `GET /users/{userId}/holdings/{shareId}/history?period=`: the holding at
 * each moment of the member's balance history, with its weight in it.
 */
export async function readHoldingHistory(
  context: ReadServices,
  input: Required<PortfolioHoldingHistoryQuery>,
): Promise<PortfolioHoldingHistory> {
  const { db } = context;
  const [, share, window] = await Promise.all([
    findPortfolioOwner(db, input.userId),
    shares.findById(db, input.shareId),
    raceWindow(context, input.period),
  ]);
  if (share === undefined) {
    throw apiError("not_found");
  }
  const points = windowPoints(window, input.userId, { closesOnly: false });
  const held = await shareValues.holdingAtMoments(db, {
    userId: input.userId,
    shareId: share.id,
    moments: points.map(({ at }) => at),
  });
  return {
    share: toShareSummary(share),
    points: held.map(({ at, quantity, priceEur }, index) => {
      const value =
        priceEur === null ? null : new Big(quantity).times(priceEur);
      const balance = new Big(points[index]?.balanceEur ?? 0);
      return {
        at: at.toISOString(),
        quantity: plain(new Big(quantity)),
        valueEur: value === null ? null : money(value),
        weight: value === null ? null : ratio(value, balance),
      };
    }),
  };
}
