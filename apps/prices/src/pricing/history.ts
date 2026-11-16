import type { IsoDate } from "@fpr/contracts";
import type { PricesHistory } from "@fpr/contracts/prices";
import { prices, shares } from "@fpr/db";
import { RatesError } from "../market/rates.js";
import { lastTradingDay } from "../market/trading-day.js";
import { ProviderError } from "../providers/index.js";
import { missingCloses, recordHistoryStart } from "./closes.js";
import type { PricedShare, PricingDeps } from "./deps.js";
import { fetchLatest } from "./latest.js";
import { storePrices } from "./store.js";

/** A fill's provider calls: the closes, then the latest price. */
const FILL_CALLS = 2;

/**
 * Makes sure a market share's closes are stored from a day, then fetches its
 * latest price. Fills of the same share run one after the other, so a second
 * fill finds the first one's closes and calls nothing. Resolves with
 * `undefined` for a missing or manual share. Rejects with a `ProviderError`,
 * `call_budget_used` when the calls left are the schedule's, or a
 * `RatesError` when the closes could not be converted.
 */
export function createHistoryFill(
  deps: PricingDeps,
): (shareId: string, from: IsoDate) => Promise<PricesHistory | undefined> {
  const queues = new Map<string, Promise<unknown>>();
  return (shareId, from) => {
    const previous = queues.get(shareId) ?? Promise.resolve();
    const fill = previous.then(() => fillHistory(deps, shareId, from));
    const settled = fill.catch(() => undefined);
    queues.set(shareId, settled);
    void settled.then(() => {
      if (queues.get(shareId) === settled) {
        queues.delete(shareId);
      }
    });
    return fill;
  };
}

async function fillHistory(
  deps: PricingDeps,
  shareId: string,
  from: IsoDate,
): Promise<PricesHistory | undefined> {
  const share = await shares.findById(deps.db, shareId);
  if (
    share?.kind !== "market" ||
    share.providerSymbol === null ||
    share.tradingCurrency === null
  ) {
    return undefined;
  }
  const priced: PricedShare = {
    id: share.id,
    providerSymbol: share.providerSymbol,
    tradingCurrency: share.tradingCurrency,
  };
  const { first } = await prices.closeDays(deps.db, share.id, deps.timeZone);
  const range = missingCloses(
    { historyStartsOn: share.historyStartsOn, firstCloseOn: first },
    from,
    lastTradingDay(deps.now(), deps.timeZone),
  );
  if (range === undefined) {
    return { historyStartsOn: share.historyStartsOn };
  }
  if (!deps.budget.allowsLookup(FILL_CALLS)) {
    throw new ProviderError(
      "call_budget_used",
      "history fill: the calls left are the schedule's",
    );
  }
  const closes = await deps.provider.closes(
    priced.providerSymbol,
    range.from,
    range.to,
  );
  const { quotes } = await fetchLatest(deps.provider, [priced]);
  const log = deps.logger.child({ run: "history", shareId });
  const stored = await storePrices(
    deps,
    { closes: [{ share: priced, closes }], quotes },
    log,
  );
  if (stored.failed.has(share.id)) {
    throw new RatesError("unavailable", "history fill: closes not converted");
  }
  log.info(
    { from: range.from, to: range.to, closesStored: stored.closesStored },
    "history filled",
  );
  return { historyStartsOn: await recordHistoryStart(deps, share.id, from) };
}
