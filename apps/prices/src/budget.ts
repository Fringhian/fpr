import type { IsoDate } from "@fpr/contracts";
import { dayIn } from "./time.js";

/**
 * The provider calls a schedule still makes today, from `now` to midnight in
 * `RACE_TIMEZONE`. Each schedule registers one with `addScheduledCalls`.
 */
export type ScheduledCalls = (now: Date) => number;

/** The fields every run's log line carries. */
export interface CallBudgetLogFields {
  /** The calls spent today. */
  callsToday: number;
  /** The calls left today. */
  callsLeft: number;
  /** `PROVIDER_DAILY_CALL_LIMIT`. */
  callLimit: number;
}

export interface CallBudgetOptions {
  /** `PROVIDER_DAILY_CALL_LIMIT`: the most calls spent in a day. */
  limit: number;
  /** `RACE_TIMEZONE`: the count restarts at midnight in it. */
  timeZone: string;
  /** The clock. Defaults to the system's. Tests pass their own. */
  now?: () => Date;
}

/**
 * The day's provider calls, counted in memory. The count restarts at zero at
 * midnight in `RACE_TIMEZONE` and when the service restarts. See
 * `docs/architecture/prices.md` › Call volume.
 */
export interface CallBudget {
  readonly limit: number;
  /** The calls spent today. */
  spent(): number;
  /** The calls left today: the limit minus the calls spent. */
  left(): number;
  /** Whether `calls` more fit under today's cap. */
  canSpend(calls: number): boolean;
  /**
   * Counts `calls` as spent and returns `true` when they fit under today's
   * cap. Returns `false` and counts nothing when they don't.
   */
  trySpend(calls: number): boolean;
  /**
   * Registers a schedule's calls still to come today. Returns a function that
   * removes it.
   */
  addScheduledCalls(scheduled: ScheduledCalls): () => void;
  /** The calls every schedule still makes today, summed. */
  scheduledCallsLeft(): number;
  /**
   * Whether a lookup or a history fill of `calls` may run: the calls left
   * after it still cover every scheduled call left today. Refused once the
   * calls left are no more than the scheduled calls left.
   */
  allowsLookup(calls?: number): boolean;
  /** The day's count, for a run's log line. */
  logFields(): CallBudgetLogFields;
}

function assertCalls(calls: number): void {
  if (!Number.isInteger(calls) || calls < 0) {
    throw new RangeError(`Expected a whole number of calls: ${calls}`);
  }
}

export function createCallBudget(options: CallBudgetOptions): CallBudget {
  const { limit, timeZone } = options;
  const now = options.now ?? (() => new Date());
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`Expected a daily call limit of 1 or more: ${limit}`);
  }
  const schedules = new Set<ScheduledCalls>();
  let day: IsoDate = dayIn(now(), timeZone);
  let spent = 0;

  /** The calls spent today, restarting the count on a new day. */
  function spentToday(): number {
    const today = dayIn(now(), timeZone);
    if (today !== day) {
      day = today;
      spent = 0;
    }
    return spent;
  }

  const budget: CallBudget = {
    limit,
    spent: spentToday,
    left: () => Math.max(0, limit - spentToday()),
    canSpend(calls) {
      assertCalls(calls);
      return calls <= budget.left();
    },
    trySpend(calls) {
      if (!budget.canSpend(calls)) {
        return false;
      }
      spent += calls;
      return true;
    },
    addScheduledCalls(scheduled) {
      schedules.add(scheduled);
      return () => {
        schedules.delete(scheduled);
      };
    },
    scheduledCallsLeft() {
      const moment = now();
      let total = 0;
      for (const scheduled of schedules) {
        const calls = scheduled(moment);
        assertCalls(calls);
        total += calls;
      }
      return total;
    },
    allowsLookup(calls = 1) {
      assertCalls(calls);
      return budget.left() - calls >= budget.scheduledCallsLeft();
    },
    logFields() {
      return {
        callsToday: spentToday(),
        callsLeft: budget.left(),
        callLimit: limit,
      };
    },
  };
  return budget;
}
