import { type Db, manualPriceEvents, type Price, prices } from "@fpr/db";

/**
 * Stores a `manual` price entered by `userId`, and its value edit: `added`,
 * or `edited` from `previousPriceEur`. Runs in the caller's transaction.
 */
export async function storeValuePoint(
  trx: Db,
  point: {
    shareId: string;
    at: Date;
    priceEur: string;
    userId: string;
    previousPriceEur?: string;
  },
): Promise<Price> {
  const { shareId, at, priceEur, userId, previousPriceEur = null } = point;
  const price = await prices.upsert(trx, {
    shareId,
    at,
    priceEur,
    source: "manual",
    enteredBy: userId,
  });
  await manualPriceEvents.insert(trx, {
    shareId,
    at,
    action: previousPriceEur === null ? "added" : "edited",
    priceEur,
    previousPriceEur,
    userId,
  });
  return price;
}
