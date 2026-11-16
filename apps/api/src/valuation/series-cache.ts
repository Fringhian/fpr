import { type BalanceSeries, type Db, prices, valuation } from "@fpr/db";

/**
 * Every member's balance series, computed once and kept in memory until
 * something it depends on changes.
 */
export interface SeriesCache {
  /** The series, recomputed when cleared, when prices were written since, or past a new close. */
  get(): Promise<BalanceSeries>;
  /**
   * Drops the series. Every write the API makes or forwards to share changes,
   * cash balances, shares or prices calls it once the write is committed.
   */
  clear(): void;
}

/**
 * The series cache. The API writes share changes and cash balances, and
 * clears it. The price service writes prices on its own, so each read first
 * compares the prices' write mark and the last close with the cached
 * series', and recomputes when either moved.
 */
export function createSeriesCache({
  db,
  timeZone,
  now = () => new Date(),
}: {
  db: Db;
  /** `RACE_TIMEZONE`. */
  timeZone: string;
  now?: () => Date;
}): SeriesCache {
  let cached: { key: string; series: Promise<BalanceSeries> } | undefined;

  async function currentKey(): Promise<string> {
    const [lastClose, mark] = await Promise.all([
      valuation.lastCloseAt(db, { now: now(), timeZone }),
      prices.writeMark(db),
    ]);
    return `${lastClose.toISOString()}|${mark}`;
  }

  return {
    async get() {
      const key = await currentKey();
      if (cached?.key === key) {
        return cached.series;
      }
      // Kept as a promise, so reads arriving while it computes share it. A
      // clear() while it computes drops it, as it may predate the write.
      const entry = {
        key,
        series: valuation.balanceSeries(db, { now: now(), timeZone }),
      };
      cached = entry;
      entry.series.catch(() => {
        if (cached === entry) {
          cached = undefined;
        }
      });
      return entry.series;
    },

    clear() {
      cached = undefined;
    },
  };
}
