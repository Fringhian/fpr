import type { Id, Period, Portfolio, PortfolioHolding } from "@fpr/contracts";
import { dayOf } from "./calendar.ts";
import { type Big, money, plain, ratio, zero } from "./decimal.ts";
import { type GainAmount, periodGain, toGain, withGains } from "./gain.ts";
import {
  firstEntryMs,
  measuredFrom,
  type PeriodWindow,
  raceWindow,
  windowInstants,
  windowPoints,
} from "./series.ts";
import {
  firstPriceDay,
  latestPrice,
  priceSeries,
  toShareSummary,
} from "./shares.ts";
import type { MockStore, StoredChange } from "./types.ts";
import {
  cashOf,
  changesOf,
  flowsOf,
  type Holding,
  holdingsNow,
} from "./valuation.ts";

function holdingView(
  store: MockStore,
  holding: Holding,
  context: { window: PeriodWindow; balanceEur: Big; changes: StoredChange[] },
): PortfolioHolding {
  const { share, quantity, valueEur } = holding;
  const { window } = context;
  const changes = context.changes.filter((c) => c.shareId === share.id);
  const [bought] = changes;
  const pricesStart = firstPriceDay(share);
  const startsBefore =
    bought !== undefined &&
    pricesStart !== null &&
    dayOf(bought.atMs) < pricesStart;
  const gain = periodGain(share, changes, {
    fromMs: window.startMs,
    toMs: store.calendar.nowMs,
  });
  return {
    share: toShareSummary(share),
    quantity: plain(quantity),
    valueEur: valueEur === null ? null : money(valueEur),
    weight: valueEur === null ? null : ratio(valueEur, context.balanceEur),
    gain: valueEur === null || gain === null ? null : toGain(gain),
    latestPrice: latestPrice(share, store.calendar.nowMs),
    pricesFrom: startsBefore ? pricesStart : null,
    series: priceSeries(share, windowInstants(store, window)),
  };
}

/** The balance's gain from the period's start to now, measured as the series' points are. */
function gainNow(
  store: MockStore,
  userId: Id,
  { window, balanceEur }: { window: PeriodWindow; balanceEur: Big },
): GainAmount {
  const atMs = store.calendar.nowMs;
  const points = windowPoints(store, userId, window, { closesOnly: false });
  const first = firstEntryMs(store, userId);
  const now =
    first === null || first > atMs
      ? []
      : [{ atMs, balanceEur, flowsEur: flowsOf(store, userId)(atMs) }];
  return (
    withGains([...points, ...now]).at(-1)?.gain ?? { eur: zero, base: zero }
  );
}

/**
 * A member's holdings and cash now, at the latest prices, and the balance's
 * gain since the period's start: since their first point when they started
 * after it.
 */
export function portfolioView(
  store: MockStore,
  userId: Id,
  period: Period,
): Portfolio {
  const now = store.calendar.nowMs;
  const window = raceWindow(store, period);
  const valuation = holdingsNow(store, userId);
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
  const first = firstEntryMs(store, userId);
  return {
    latestPricesAt: pricedAt.at(-1) ?? null,
    balanceEur: money(valuation.balanceEur),
    sharesEur: money(valuation.sharesEur),
    sharesWeight: ratio(valuation.sharesEur, valuation.balanceEur),
    cashEur: money(valuation.cashEur),
    cashWeight: ratio(valuation.cashEur, valuation.balanceEur),
    cashSetAt:
      cashOf(store, userId).findLast(({ atMs }) => atMs <= now)?.effectiveAt ??
      null,
    gain: toGain(
      gainNow(store, userId, { window, balanceEur: valuation.balanceEur }),
    ),
    firstEntryOn: first === null ? null : dayOf(first),
    measuredFrom: measuredFrom(store, userId, window),
    incomplete: valuation.incomplete,
    holdings,
  };
}
