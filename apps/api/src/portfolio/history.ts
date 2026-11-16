import { type Db, prices, type Share } from "@fpr/db";
import type { Logger } from "pino";
import { type PricesClient, requestHistory } from "../prices/prices-client.js";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * After a change to a market share is saved, asks the price service for its
 * closes from the change's day, without waiting, when none is stored in the
 * week up to the change: its first holding, a change dated before its stored
 * history, or after a gap. Days before `history_starts_on` are never fetched
 * again, as the provider has none.
 */
export async function fillMissingHistory(
  context: {
    db: Db;
    prices: PricesClient;
    raceTimeZone: string;
    logger: Logger;
  },
  share: Share,
  effectiveAt: Date,
): Promise<void> {
  if (share.kind !== "market") {
    return;
  }
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: context.raceTimeZone,
  }).format(effectiveAt);
  if (share.historyStartsOn !== null && day < share.historyStartsOn) {
    return;
  }
  const closes = await prices.listBetween(
    context.db,
    share.id,
    new Date(effectiveAt.getTime() - WEEK_MS),
    effectiveAt,
    ["close"],
  );
  if (closes.length === 0) {
    requestHistory(context.prices, context.logger, share.id, day);
  }
}
