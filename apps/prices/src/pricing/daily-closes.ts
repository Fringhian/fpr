import { randomUUID } from "node:crypto";
import { type HeldMarketShare, lastTradingDay, prices } from "@fpr/db";
import type { Logger } from "pino";
import {
  type ClosesJob,
  closesJobs,
  fetchCloses,
  recordHistoryStarts,
} from "./closes.js";
import type { PricingDeps } from "./deps.js";
import { storePrices } from "./store.js";

/** How many times a failing share is retried, an hour apart. */
const RETRIES = 3;
const RETRY_DELAY_MS = 60 * 60 * 1000;
const INTRADAY_KEPT_MS = 7 * 24 * 60 * 60 * 1000;

/** Runs `task` after `ms`, and returns what cancels it. */
export type Later = (task: () => void, ms: number) => () => void;

const setTimer: Later = (task, ms) => {
  const timer = setTimeout(task, ms);
  return () => clearTimeout(timer);
};

export interface DailyCloses {
  /**
   * Stores every held share's closes since its latest, after its missing
   * history, and deletes `intraday` prices older than 7 days. A share that
   * fails is retried every hour, three times.
   */
  run(): Promise<void>;
  /** The calls the pending retries still make today. */
  retryCalls(): number;
  /** Cancels the pending retries. */
  stop(): void;
}

interface Retries {
  shareIds: Set<string>;
  left: number;
  cancel: () => void;
}

export function createDailyCloses(
  deps: PricingDeps,
  options: {
    listHeld: () => Promise<HeldMarketShare[]>;
    later?: Later | undefined;
  },
): DailyCloses {
  const later = options.later ?? setTimer;
  let retries: Retries | undefined;

  const scheduleRetry = (shareIds: Set<string>, left: number): void => {
    const cancel = later(() => {
      void retry().catch((error: unknown) =>
        deps.logger.error({ err: error, run: "daily-closes" }, "retry failed"),
      );
    }, RETRY_DELAY_MS);
    retries = { shareIds, left, cancel };
  };

  const retry = async (): Promise<void> => {
    const pending = retries;
    if (pending === undefined) {
      return;
    }
    const log = runLogger(deps, "daily-closes retry");
    const held = (await options.listHeld()).filter(({ id }) =>
      pending.shareIds.has(id),
    );
    const { failed, jobs } = await fetchAndStore(deps, held, log);
    retries = undefined;
    if (failed.size > 0 && pending.left > 1) {
      scheduleRetry(failed, pending.left - 1);
    } else {
      logStillMissing(log, jobs, failed);
    }
  };

  return {
    async run() {
      retries?.cancel();
      retries = undefined;
      const log = runLogger(deps, "daily-closes");
      const deleted = await prices.deleteIntradayBefore(
        deps.db,
        new Date(deps.now().getTime() - INTRADAY_KEPT_MS),
      );
      const held = await options.listHeld();
      const { failed } = await fetchAndStore(deps, held, log, { deleted });
      if (failed.size > 0) {
        scheduleRetry(failed, RETRIES);
      }
    },
    retryCalls: () =>
      retries === undefined ? 0 : retries.shareIds.size * retries.left,
    stop() {
      retries?.cancel();
      retries = undefined;
    },
  };
}

function runLogger(deps: PricingDeps, run: string): Logger {
  return deps.logger.child({ run, runId: randomUUID() });
}

/** Fetches and stores the held shares' closes, and logs the run. */
async function fetchAndStore(
  deps: PricingDeps,
  held: readonly HeldMarketShare[],
  log: Logger,
  extra: Record<string, unknown> = {},
): Promise<{ failed: Set<string>; jobs: ClosesJob[] }> {
  const jobs = closesJobs(held, lastTradingDay(deps.now(), deps.timeZone), {
    sinceLastClose: true,
  });
  if (jobs.length > 0 && !deps.budget.canSpend(jobs.length)) {
    log.warn(
      { calls: jobs.length, ...deps.budget.logFields() },
      "daily closes skipped: daily call cap reached",
    );
    return { failed: new Set(), jobs };
  }
  const closes = await fetchCloses(deps.provider, jobs);
  const stored = await storePrices(
    deps,
    { closes: closes.closes, quotes: [] },
    log,
  );
  const failed = new Set([...closes.failed, ...stored.failed]);
  await recordHistoryStarts(deps, jobs, failed);
  log[failed.size === 0 ? "info" : "warn"](
    {
      shares: held.length,
      closesStored: stored.closesStored,
      failures: failed.size,
      ...extra,
      ...deps.budget.logFields(),
    },
    "daily closes run",
  );
  return { failed, jobs };
}

function logStillMissing(
  log: Logger,
  jobs: readonly ClosesJob[],
  failed: ReadonlySet<string>,
): void {
  for (const { share, range } of jobs) {
    if (failed.has(share.id)) {
      log.error(
        { shareId: share.id, symbol: share.providerSymbol, ...range },
        "closes still missing after every retry",
      );
    }
  }
}
