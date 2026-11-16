import type {
  Decimal,
  Id,
  Period,
  Portfolio,
  PortfolioCashBalance,
  PortfolioChange,
  PortfolioHolding,
  PortfolioLogEntry,
} from "@fpr/contracts";
import { dayOf } from "./calendar.ts";
import { Big, money, plain, ratio, zero } from "./decimal.ts";
import { gainBetween, toGain } from "./gain.ts";
import { firstEntryOn } from "./people.ts";
import {
  measuredFrom,
  type PeriodWindow,
  periodWindow,
  windowInstants,
} from "./series.ts";
import {
  firstPriceDay,
  latestPrice,
  priceSeries,
  toShareSummary,
} from "./shares.ts";
import type {
  MockStore,
  StoredCash,
  StoredChange,
  StoredEntry,
} from "./types.ts";
import {
  changesOf,
  type Holding,
  priceAt,
  quantitiesAt,
  shareOf,
  valuationAt,
} from "./valuation.ts";

export function toChange(
  store: MockStore,
  change: StoredChange,
): PortfolioChange {
  const share = shareOf(store, change.shareId);
  if (share === undefined) {
    throw new Error(`Share ${change.shareId} is missing`);
  }
  return {
    type: "change",
    id: change.id,
    share: toShareSummary(share),
    quantityDelta: change.quantityDelta,
    effectiveAt: change.effectiveAt,
    madeBy: null,
  };
}

export function toCash(cash: StoredCash): PortfolioCashBalance {
  return {
    type: "cash",
    id: cash.id,
    amountEur: cash.amountEur,
    effectiveAt: cash.effectiveAt,
    madeBy: null,
  };
}

export function toLogEntry(
  store: MockStore,
  entry: StoredEntry,
): PortfolioLogEntry {
  if (entry.type === "cash") {
    return { ...toCash(entry), previousAmountEur: null };
  }
  const held = quantitiesAt(changesOf(store, entry.userId), entry.atMs);
  return {
    ...toChange(store, entry),
    quantityAfter: plain(held.get(entry.shareId) ?? zero),
  };
}

/**
 * The weight of an entry in its holder's balance just after it: what an
 * anonymous viewer sees in place of its quantity or cash.
 */
export function entryWeight(store: MockStore, entry: StoredEntry): Decimal {
  const { balanceEur } = valuationAt(store, entry.userId, entry.atMs);
  if (entry.type === "cash") {
    return ratio(new Big(entry.amountEur), balanceEur) ?? "0";
  }
  const share = shareOf(store, entry.shareId);
  const price = share === undefined ? null : priceAt(share, entry.atMs);
  const value =
    price === null ? new Big(0) : price.times(entry.quantityDelta).abs();
  return ratio(value, balanceEur) ?? "0";
}

function holdingView(
  store: MockStore,
  holding: Holding,
  context: { window: PeriodWindow; balanceEur: Big; changes: StoredChange[] },
): PortfolioHolding {
  const { share, quantity, valueEur } = holding;
  const { window, changes } = context;
  const bought = changes.find((change) => change.shareId === share.id);
  const pricesStart = firstPriceDay(share);
  const startsBefore =
    bought !== undefined &&
    pricesStart !== null &&
    dayOf(bought.atMs) < pricesStart;
  return {
    share: toShareSummary(share),
    quantity: plain(quantity),
    valueEur: valueEur === null ? null : money(valueEur),
    weight: valueEur === null ? null : ratio(valueEur, context.balanceEur),
    gain:
      valueEur === null
        ? null
        : toGain(
            gainBetween(
              store,
              changes,
              window.startMs,
              store.calendar.nowMs,
              share.id,
            ),
          ),
    latestPrice: latestPrice(share, store.calendar.nowMs),
    pricesFrom: startsBefore ? pricesStart : null,
    series: priceSeries(share, windowInstants(store, window)),
  };
}

/** A member's portfolio now, with its gain over the period. */
export function portfolioView(
  store: MockStore,
  userId: Id,
  period: Period,
): Portfolio {
  const now = store.calendar.nowMs;
  const window = periodWindow(store, period, firstEntryOn(store, userId));
  const valuation = valuationAt(store, userId, now);
  const changes = changesOf(store, userId);
  const holdings = valuation.holdings.map((holding) =>
    holdingView(store, holding, {
      window,
      balanceEur: valuation.balanceEur,
      changes,
    }),
  );
  const pricedAt = holdings
    .flatMap((holding) => holding.latestPrice?.at ?? [])
    .sort();
  return {
    latestPricesAt: pricedAt.at(-1) ?? null,
    balanceEur: money(valuation.balanceEur),
    sharesEur: money(valuation.sharesEur),
    sharesWeight: ratio(valuation.sharesEur, valuation.balanceEur),
    cashEur: money(valuation.cashEur),
    cashWeight: ratio(valuation.cashEur, valuation.balanceEur),
    gain: toGain(gainBetween(store, changes, window.startMs, now)),
    firstEntryOn: firstEntryOn(store, userId),
    measuredFrom: measuredFrom(store, userId, window),
    incomplete: valuation.incomplete,
    holdings,
  };
}
