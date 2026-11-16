import type {
  IsoDate,
  LatestPrice,
  PriceChange,
  PricePoint,
  ShareSummary,
} from "@fpr/contracts";
import { dayOf, timestamp } from "./calendar.ts";
import { Big, money, percent } from "./decimal.ts";
import type { MockStore, StoredShare } from "./types.ts";
import { pricePointAt } from "./valuation.ts";

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

/**
 * One unit's price change from the window's start to `endMs`, or `null`
 * without a price at the start.
 */
export function priceChange(
  share: StoredShare,
  startMs: number,
  endMs: number,
): PriceChange | null {
  const start = pricedAt(share, startMs) ? pricePointAt(share, startMs) : null;
  const end = pricePointAt(share, endMs);
  if (start === null || end === null) {
    return null;
  }
  const change = new Big(end.priceEur).minus(start.priceEur);
  return {
    eur: money(change),
    percent: percent(change.div(start.priceEur).times(100)),
  };
}

/** The day a share's prices start, or `null` with none. */
export function firstPriceDay(share: StoredShare): IsoDate | null {
  const first = share.prices[0];
  return first === undefined ? null : dayOf(first.atMs);
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
