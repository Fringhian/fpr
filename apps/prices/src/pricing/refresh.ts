import { randomUUID } from "node:crypto";
import type { RefreshRun, RefreshState } from "@fpr/contracts";
import { type HeldMarketShare, lastTradingDay } from "@fpr/db";
import type { Cron } from "croner";
import { dayIn } from "../market/time.js";
import type { ProviderErrorReason } from "../providers/index.js";
import { closesJobs, fetchCloses, recordHistoryStarts } from "./closes.js";
import type { PricingDeps } from "./deps.js";
import { fetchLatest } from "./latest.js";
import { storePrices } from "./store.js";

/** A finished run, and why it failed when a call did. */
export interface RefreshOutcome {
  run: RefreshRun;
  cause: ProviderErrorReason | undefined;
}

export interface Refresh {
  /**
   * Runs the intraday refresh: the missing closes of held shares first, then
   * their latest prices. Resolves with `undefined`, running nothing, while
   * another run is going.
   */
  run(trigger: RefreshRun["trigger"]): Promise<RefreshOutcome | undefined>;
  state(): RefreshState;
}

export function createRefresh(
  deps: PricingDeps,
  options: { listHeld: () => Promise<HeldMarketShare[]>; schedule: Cron },
): Refresh {
  let running = false;
  let last: RefreshRun | null = null;
  let runsToday = { day: "", count: 0 };
  const today = () => dayIn(deps.now(), deps.timeZone);

  return {
    async run(trigger) {
      if (running) {
        return undefined;
      }
      running = true;
      try {
        const outcome = await refreshOnce(
          deps,
          trigger,
          await options.listHeld(),
        );
        last = outcome.run;
        if (outcome.run.status !== "skipped") {
          const day = today();
          runsToday = {
            day,
            count: runsToday.day === day ? runsToday.count + 1 : 1,
          };
        }
        return outcome;
      } finally {
        running = false;
      }
    },
    state: () => ({
      lastRunAt: last?.finishedAt ?? null,
      lastResult: last,
      nextRunAt: options.schedule.nextRun(deps.now())?.toISOString() ?? null,
      runsToday: runsToday.day === today() ? runsToday.count : 0,
      cap: deps.budget.logFields(),
    }),
  };
}

async function refreshOnce(
  deps: PricingDeps,
  trigger: RefreshRun["trigger"],
  held: readonly HeldMarketShare[],
): Promise<RefreshOutcome> {
  const startedAt = deps.now();
  const log = deps.logger.child({ run: "intraday", runId: randomUUID() });
  const jobs = closesJobs(held, lastTradingDay(startedAt, deps.timeZone), {
    sinceLastClose: false,
  });
  const finish = (
    status: RefreshRun["status"],
    counts: Pick<RefreshRun, "sharesPriced" | "closesStored" | "failures">,
  ): RefreshRun => ({
    trigger,
    status,
    startedAt: startedAt.toISOString(),
    finishedAt: deps.now().toISOString(),
    ...counts,
  });

  const calls = jobs.length + held.length;
  if (calls > 0 && !deps.budget.canSpend(calls)) {
    log.warn(
      { calls, ...deps.budget.logFields() },
      "refresh skipped: daily call cap reached",
    );
    const counts = { sharesPriced: 0, closesStored: 0, failures: 0 };
    return { run: finish("skipped", counts), cause: "call_budget_used" };
  }

  const closes = await fetchCloses(deps.provider, jobs);
  const latest =
    closes.cause === "call_budget_used"
      ? {
          quotes: [],
          failed: new Set(held.map(({ id }) => id)),
          cause: closes.cause,
        }
      : await fetchLatest(deps.provider, held);
  const stored = await storePrices(
    deps,
    { closes: closes.closes, quotes: latest.quotes },
    log,
  );
  const failed = new Set([
    ...closes.failed,
    ...latest.failed,
    ...stored.failed,
  ]);
  await recordHistoryStarts(deps, jobs, failed);

  const counts = {
    sharesPriced: stored.sharesPriced.length,
    closesStored: stored.closesStored,
    failures: failed.size,
  };
  const status =
    failed.size === 0
      ? "succeeded"
      : failed.size >= held.length
        ? "failed"
        : "partial";
  log[status === "succeeded" ? "info" : "warn"](
    { shares: held.length, status, ...counts, ...deps.budget.logFields() },
    "refresh run",
  );
  return {
    run: finish(status, counts),
    cause:
      closes.cause ??
      latest.cause ??
      (stored.failed.size > 0 ? "unavailable" : undefined),
  };
}
