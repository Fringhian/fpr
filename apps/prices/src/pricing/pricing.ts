import type { IsoDate } from "@fpr/contracts";
import type { PricesHistory } from "@fpr/contracts/prices";
import { type HeldMarketShare, shares } from "@fpr/db";
import { Cron } from "croner";
import { dayIn } from "../market/time.js";
import {
  createDailyCloses,
  type DailyCloses,
  type Later,
} from "./daily-closes.js";
import type { PricingDeps } from "./deps.js";
import { createHistoryFill } from "./history.js";
import { createRefresh, type Refresh } from "./refresh.js";

/** The intraday refresh's default schedule: every 30 minutes, 09:00 to 22:30, Monday to Friday. */
export const defaultRefreshSchedule = "*/30 9-22 * * 1-5";

/** The daily closes run: 07:00, Tuesday to Saturday. */
export const dailyClosesSchedule = "0 7 * * 2-6";

/** The price service's work: history fills, the intraday refresh, and the daily closes. */
export interface Pricing {
  deps: PricingDeps;
  /** See `createHistoryFill`. */
  fillHistory(
    shareId: string,
    from: IsoDate,
  ): Promise<PricesHistory | undefined>;
  refresh: Refresh;
  dailyCloses: DailyCloses;
  /** The schedules' patterns in `RACE_TIMEZONE`, which never run anything themselves. */
  schedules: { refresh: Cron; dailyCloses: Cron };
  /** Every held market share, which also updates the count the schedules reserve calls for. */
  listHeld(): Promise<HeldMarketShare[]>;
}

/**
 * Builds the price service's work over its dependencies, and reserves on the
 * call budget the calls each schedule still makes today: one per held share
 * per run left, plus the daily closes' pending retries.
 */
export function createPricing(
  deps: PricingDeps,
  options: { refreshSchedule?: string; later?: Later } = {},
): Pricing {
  const timezone = deps.timeZone;
  const schedules = {
    refresh: new Cron(options.refreshSchedule ?? defaultRefreshSchedule, {
      timezone,
    }),
    dailyCloses: new Cron(dailyClosesSchedule, { timezone }),
  };
  const held = { count: 0 };
  const listHeld = async () => {
    const rows = await shares.listHeldMarket(deps.db, deps.timeZone);
    held.count = rows.length;
    return rows;
  };
  const refresh = createRefresh(deps, {
    listHeld,
    schedule: schedules.refresh,
  });
  const dailyCloses = createDailyCloses(deps, {
    listHeld,
    later: options.later,
  });
  const fill = createHistoryFill(deps);

  const runsLeft = (cron: Cron, now: Date) =>
    runsLeftToday(cron, now, deps.timeZone);
  deps.budget.addScheduledCalls(
    (now) => runsLeft(schedules.refresh, now) * held.count,
  );
  deps.budget.addScheduledCalls(
    (now) =>
      runsLeft(schedules.dailyCloses, now) * held.count +
      dailyCloses.retryCalls(),
  );

  return {
    deps,
    async fillHistory(shareId, from) {
      const history = await fill(shareId, from);
      await listHeld();
      return history;
    },
    refresh,
    dailyCloses,
    schedules,
    listHeld,
  };
}

/**
 * Starts the intraday refresh and the daily closes on their schedules in
 * `RACE_TIMEZONE`. A tick while the previous run of the same job is still
 * going is skipped. Returns what stops them.
 */
export function startSchedules(pricing: Pricing): () => void {
  const { logger, timeZone } = pricing.deps;
  const failed = (run: string) => (error: unknown) => {
    logger.error({ err: error, run }, "run failed");
  };
  const options = { timezone: timeZone, protect: true };
  const jobs = [
    new Cron(
      pricing.schedules.refresh.getPattern() ?? "",
      options,
      async () => {
        await pricing.refresh.run("schedule").catch(failed("intraday"));
      },
    ),
    new Cron(
      pricing.schedules.dailyCloses.getPattern() ?? "",
      options,
      async () => {
        await pricing.dailyCloses.run().catch(failed("daily-closes"));
      },
    ),
  ];
  // The schedules reserve calls for the held shares from the start.
  void pricing.listHeld().catch(failed("startup"));
  return () => {
    for (const job of jobs) {
      job.stop();
    }
    pricing.dailyCloses.stop();
  };
}

/** How many times a schedule still runs from `now` to midnight in the time zone. */
function runsLeftToday(cron: Cron, now: Date, timeZone: string): number {
  const today = dayIn(now, timeZone);
  let count = 0;
  for (
    let next = cron.nextRun(now);
    next !== null && dayIn(next, timeZone) === today;
    next = cron.nextRun(next)
  ) {
    count += 1;
  }
  return count;
}
