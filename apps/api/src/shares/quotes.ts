import type {
  Period,
  PriceChange,
  PricePoint,
  ShareQuote,
} from "@fpr/contracts";
import { type Share, type ShareValue, shareCharts, shareValues } from "@fpr/db";
import type { ApiServices } from "../orpc.js";
import { Big, money, ratio } from "../valuation/decimal.js";
import { type RaceWindow, raceWindow } from "../valuation/race-window.js";
import { toLatestPrice, toShareSummary } from "./share-summary.js";

type ReadServices = Pick<ApiServices, "db" | "series" | "raceTimeZone">;

/** Shares with their latest price and their change over the period, and that period. */
export interface ShareQuotes {
  window: RaceWindow;
  quote: (share: Share) => ShareQuote;
}

/**
 * Each share's latest price, and the change of one unit's price from the
 * period's start to it: from the latest price at the start, or for `all`
 * from the share's first price. No change without a price at the start.
 */
export async function shareQuotes(
  context: ReadServices,
  ids: readonly string[],
  period: Period,
): Promise<ShareQuotes> {
  const { db } = context;
  const window = await raceWindow(context, period);
  const [latest, starts] = await Promise.all([
    shareValues.valuesAt(db, ids, { fallback: false }),
    changeStarts(db, ids, { period, window }),
  ]);
  return {
    window,
    quote: (share) => ({
      ...toShareSummary(share),
      latestPrice: toLatestPrice(latest.get(share.id)),
      change: priceChange(starts.get(share.id), latest.get(share.id)),
    }),
  };
}

/** The prices a period's change starts from, by share id: for `all`, each share's first. */
export function changeStarts(
  db: ReadServices["db"],
  ids: readonly string[],
  { period, window }: { period: Period; window: RaceWindow },
): Promise<Map<string, ShareValue>> {
  return period === "all"
    ? shareValues.earliestValues(db, ids)
    : shareValues.valuesAt(db, ids, { at: window.startAt, fallback: false });
}

/** The change of one unit's price between two prices, or `null` without both. */
export function priceChange(
  start: ShareValue | undefined,
  end: ShareValue | undefined,
): PriceChange | null {
  if (start === undefined || end === undefined) {
    return null;
  }
  const change = new Big(end.priceEur).minus(start.priceEur);
  return {
    eur: money(change),
    // A price is above zero, so the ratio always has one.
    percent: ratio(change, new Big(start.priceEur)) ?? "0.00",
  };
}

/**
 * Each share's chart points over the period, by share id: its price at the
 * start, then its closes and value points, with its 30-minute prices over
 * the whole period, since the last close, or none, as `intraday` says. `all`
 * starts at the share's first price.
 */
export async function chartPoints(
  context: ReadServices,
  ids: readonly string[],
  {
    window,
    period,
    intraday,
  }: {
    window: RaceWindow;
    period: Period;
    intraday: "period" | "since last close" | "none";
  },
): Promise<Map<string, PricePoint[]>> {
  const from = period === "all" ? null : window.startAt;
  const intradayAfter = {
    period: from ?? new Date(0),
    "since last close": window.series.lastCloseAt,
    none: null,
  }[intraday];
  const points = await shareCharts.series(context.db, ids, {
    from,
    intradayAfter,
  });
  return new Map(
    [...points].map(([id, series]) => [
      id,
      series.map(({ at, priceEur }) => ({ at: at.toISOString(), priceEur })),
    ]),
  );
}
