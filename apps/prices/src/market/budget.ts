import type { IsoDate } from "@fpr/contracts";
import { dayIn } from "./time.js";

/**
 * The provider calls a schedule still makes today, from `now` to midnight in
 * `RACE_TIMEZONE`. Each schedule registers one with `addScheduledCalls`.
 */
export type ScheduledCalls = (now: Date) => number;

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
  /**
   * The day's count, for a run's log line. `callLimit` is
   * `PROVIDER_DAILY_CALL_LIMIT`.
   */
  logFields(): { callsToday: number; callsLeft: number; callLimit: number };
}

/** What a budget's methods share: its settings, its schedules, and the day's count. */
interface BudgetState {
  readonly limit: number;
  readonly timeZone: string;
  readonly now: () => Date;
  readonly schedules: Set<ScheduledCalls>;
  day: IsoDate;
  spent: number;
}

export function createCallBudget(options: {
  /** `PROVIDER_DAILY_CALL_LIMIT`: the most calls spent in a day. */
  limit: number;
  /** `RACE_TIMEZONE`: the count restarts at midnight in it. */
  timeZone: string;
  /** Defaults to the system clock. */
  now?: () => Date;
}): CallBudget {
  const { limit, timeZone } = options;
  const now = options.now ?? (() => new Date());
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError(`Expected a daily call limit of 1 or more: ${limit}`);
  }
  const state: BudgetState = {
    limit,
    timeZone,
    now,
    schedules: new Set(),
    day: dayIn(now(), timeZone),
    spent: 0,
  };
  return {
    limit,
    spent: () => spentToday(state),
    left: () => callsLeft(state),
    canSpend: (calls) => canSpend(state, calls),
    trySpend: (calls) => trySpend(state, calls),
    addScheduledCalls: (scheduled) => addScheduledCalls(state, scheduled),
    scheduledCallsLeft: () => scheduledCallsLeft(state),
    allowsLookup: (calls = 1) => allowsLookup(state, calls),
    logFields: () => ({
      callsToday: spentToday(state),
      callsLeft: callsLeft(state),
      callLimit: limit,
    }),
  };
}

/** The calls spent today, restarting the count on a new day. */
function spentToday(state: BudgetState): number {
  const today = dayIn(state.now(), state.timeZone);
  if (today !== state.day) {
    state.day = today;
    state.spent = 0;
  }
  return state.spent;
}

function callsLeft(state: BudgetState): number {
  return Math.max(0, state.limit - spentToday(state));
}

function canSpend(state: BudgetState, calls: number): boolean {
  assertCalls(calls);
  return calls <= callsLeft(state);
}

function trySpend(state: BudgetState, calls: number): boolean {
  if (!canSpend(state, calls)) {
    return false;
  }
  state.spent += calls;
  return true;
}

function addScheduledCalls(
  state: BudgetState,
  scheduled: ScheduledCalls,
): () => void {
  state.schedules.add(scheduled);
  return () => {
    state.schedules.delete(scheduled);
  };
}

function scheduledCallsLeft(state: BudgetState): number {
  const moment = state.now();
  let total = 0;
  for (const scheduled of state.schedules) {
    const calls = scheduled(moment);
    assertCalls(calls);
    total += calls;
  }
  return total;
}

function allowsLookup(state: BudgetState, calls: number): boolean {
  assertCalls(calls);
  return callsLeft(state) - calls >= scheduledCallsLeft(state);
}

function assertCalls(calls: number): void {
  if (!Number.isInteger(calls) || calls < 0) {
    throw new RangeError(`Expected a whole number of calls: ${calls}`);
  }
}
