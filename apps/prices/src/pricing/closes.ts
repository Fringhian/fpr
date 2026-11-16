import type { IsoDate } from "@fpr/contracts";
import { type HeldMarketShare, prices, shares } from "@fpr/db";
import { addDays } from "../market/time.js";
import {
  type PriceProvider,
  ProviderError,
  type ProviderErrorReason,
} from "../providers/index.js";
import type { PricedShare, PricingDeps } from "./deps.js";
import type { FetchedPrices } from "./store.js";

/** How far before a holding's first day its closes start, so a weekend or holiday start has a price. */
const DAYS_BEFORE_HOLDING = 7;

interface CloseRange {
  from: IsoDate;
  to: IsoDate;
}

/** Closes to fetch for a share. `historyFrom` is the holding's first day, for a fill. */
export interface ClosesJob {
  share: PricedShare;
  range: CloseRange;
  historyFrom?: IsoDate;
}

/**
 * The closes a share misses for a holding from `from`: from a week before it
 * to the day before its earliest stored close, or to the last trading day
 * when it has none. Nothing before `historyStartsOn` is fetched, and nothing
 * when a stored close already covers `from`, so a stored close is never
 * fetched again.
 */
export function missingCloses(
  share: { historyStartsOn: IsoDate | null; firstCloseOn: IsoDate | null },
  from: IsoDate,
  lastTradingDay: IsoDate,
): CloseRange | undefined {
  const { historyStartsOn, firstCloseOn } = share;
  const target =
    historyStartsOn !== null && historyStartsOn > from ? historyStartsOn : from;
  if (firstCloseOn !== null && firstCloseOn <= target) {
    return undefined;
  }
  const weekBefore = addDays(target, -DAYS_BEFORE_HOLDING);
  const range = {
    from:
      historyStartsOn !== null && historyStartsOn > weekBefore
        ? historyStartsOn
        : weekBefore,
    to:
      firstCloseOn !== null && addDays(firstCloseOn, -1) < lastTradingDay
        ? addDays(firstCloseOn, -1)
        : lastTradingDay,
  };
  return range.from <= range.to ? range : undefined;
}

/**
 * The closes held shares miss: each one's missing history, and with
 * `sinceLastClose`, every trading day after its latest close.
 */
export function closesJobs(
  held: readonly HeldMarketShare[],
  lastTradingDay: IsoDate,
  { sinceLastClose }: { sinceLastClose: boolean },
): ClosesJob[] {
  return held.flatMap((share) => {
    const jobs: ClosesJob[] = [];
    const missing = share.missingCloses
      ? missingCloses(share, share.firstHeldOn, lastTradingDay)
      : undefined;
    if (missing !== undefined) {
      jobs.push({ share, range: missing, historyFrom: share.firstHeldOn });
    }
    if (sinceLastClose && share.lastCloseOn !== null) {
      const from = addDays(share.lastCloseOn, 1);
      if (from <= lastTradingDay) {
        jobs.push({ share, range: { from, to: lastTradingDay } });
      }
    }
    return jobs;
  });
}

export interface FetchedCloses {
  closes: FetchedPrices["closes"];
  failed: Set<string>;
  /** The first provider failure, `call_budget_used` stopping the rest. */
  cause: ProviderErrorReason | undefined;
}

/**
 * Fetches each job's closes, one call each, one after another. A failed call
 * fails its share; the day's cap stops the rest.
 */
export async function fetchCloses(
  provider: PriceProvider,
  jobs: readonly ClosesJob[],
): Promise<FetchedCloses> {
  const result: FetchedCloses = {
    closes: [],
    failed: new Set(),
    cause: undefined,
  };
  for (const [index, { share, range }] of jobs.entries()) {
    try {
      const closes = await provider.closes(
        share.providerSymbol,
        range.from,
        range.to,
      );
      result.closes.push({ share, closes });
    } catch (error) {
      if (!(error instanceof ProviderError)) {
        throw error;
      }
      result.failed.add(share.id);
      result.cause ??= error.reason;
      if (error.reason === "call_budget_used") {
        for (const rest of jobs.slice(index + 1)) {
          result.failed.add(rest.share.id);
        }
        result.cause = error.reason;
        break;
      }
    }
  }
  return result;
}

/**
 * Stores a share's `historyStartsOn` once a fetch from `from` found its
 * earliest close later than that day. Resolves with the share's
 * `historyStartsOn`.
 */
export async function recordHistoryStart(
  deps: PricingDeps,
  shareId: string,
  from: IsoDate,
): Promise<IsoDate | null> {
  return deps.db.transaction().execute(async (trx) => {
    const share = await shares.lockById(trx, shareId);
    if (share === undefined || share.historyStartsOn !== null) {
      return share?.historyStartsOn ?? null;
    }
    const { first } = await prices.closeDays(trx, shareId, deps.timeZone);
    if (first === null || first <= from) {
      return null;
    }
    await shares.update(trx, shareId, { historyStartsOn: first });
    return first;
  });
}

/** Records the history start of each fill whose share got its closes. */
export async function recordHistoryStarts(
  deps: PricingDeps,
  jobs: readonly ClosesJob[],
  failed: ReadonlySet<string>,
): Promise<void> {
  for (const { share, historyFrom } of jobs) {
    if (historyFrom !== undefined && !failed.has(share.id)) {
      await recordHistoryStart(deps, share.id, historyFrom);
    }
  }
}
