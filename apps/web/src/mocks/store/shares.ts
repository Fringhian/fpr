import type {
  IsoDate,
  LatestPrice,
  Period,
  PriceChange,
  PricePoint,
  ShareSummary,
} from "@fpr/contracts";
import { addDays, dayOf, timestamp, tradingDayOnOrBefore } from "./calendar.ts";
import { Big, money, percent } from "./decimal.ts";
import { racers } from "./people.ts";
import { type PeriodWindow, raceWindow, windowFrom } from "./series.ts";
import type { MockPerson, MockStore, StoredShare } from "./types.ts";
import { holdingsNow, pricePointAt } from "./valuation.ts";

export function toShareSummary(share: StoredShare): ShareSummary {
  return {
    id: share.id,
    isin: share.isin,
    name: share.name,
    kind: share.kind,
    symbol: share.symbol,
  };
}

/** The latest price at a moment, with its time and source, or `null` with none. */
export function latestPrice(
  share: StoredShare,
  atMs: number,
): LatestPrice | null {
  const point = pricePointAt(share, atMs);
  if (point === null || point.atMs > atMs) {
    return null;
  }
  return {
    at: timestamp(point.atMs),
    priceEur: point.priceEur,
    source: point.source,
  };
}

/** Whether the share had a price at a moment, not only after it. */
function pricedAt(share: StoredShare, atMs: number): boolean {
  const first = share.prices[0];
  return first !== undefined && first.atMs <= atMs;
}

/** The price at each moment the share had one. */
export function priceSeries(
  share: StoredShare,
  instants: readonly number[],
): PricePoint[] {
  return instants.flatMap((atMs) => {
    const point = pricedAt(share, atMs) ? pricePointAt(share, atMs) : null;
    return point === null
      ? []
      : [{ at: timestamp(atMs), priceEur: point.priceEur }];
  });
}

/** A share's first price, or `undefined` with none. */
export function earliestPrice(share: StoredShare) {
  return share.prices[0];
}

/**
 * One unit's price change from its price at `startMs` to its price at
 * `endMs`, or `null` without a price at both.
 */
export function priceChange(
  share: StoredShare,
  startMs: number,
  endMs: number,
): PriceChange | null {
  const start = pricedAt(share, startMs) ? pricePointAt(share, startMs) : null;
  const end = pricedAt(share, endMs) ? pricePointAt(share, endMs) : null;
  if (start === null || end === null) {
    return null;
  }
  const change = new Big(end.priceEur).minus(start.priceEur);
  return {
    eur: money(change),
    percent: percent(change.div(start.priceEur).times(100)),
  };
}

/** A share's chart window: the race's, but `all` starts at the share's first price. */
export function shareWindow(
  store: MockStore,
  share: StoredShare,
  period: Period,
): PeriodWindow {
  const first = firstPriceDay(share);
  return period === "all" && first !== null
    ? windowFrom(store, tradingDayOnOrBefore(addDays(first, -1)))
    : raceWindow(store, period);
}

/**
 * One unit's change over a period to `endMs`: from the race window's start,
 * or for `all` from the share's first price. `null` without a price at both.
 */
export function periodPriceChange(
  share: StoredShare,
  period: Period,
  { window, endMs }: { window: PeriodWindow; endMs: number },
): PriceChange | null {
  const startMs =
    period === "all" ? earliestPrice(share)?.atMs : window.startMs;
  return startMs === undefined ? null : priceChange(share, startMs, endMs);
}

/** The day a share's prices start, or `null` with none. */
export function firstPriceDay(share: StoredShare): IsoDate | null {
  const first = share.prices[0];
  return first === undefined ? null : dayOf(first.atMs);
}

/** The racers holding a share now. */
export function holdersNow(store: MockStore, share: StoredShare): MockPerson[] {
  return racers(store).filter((person) =>
    holdingsNow(store, person.id).holdings.some(
      (holding) => holding.share.id === share.id,
    ),
  );
}

/** A share by id, or `not_found` through `missing`. */
export function requireShare(
  store: MockStore,
  shareId: string,
  missing: () => Error,
): StoredShare {
  const share = store.shares.find((candidate) => candidate.id === shareId);
  if (share === undefined) {
    throw missing();
  }
  return share;
}
