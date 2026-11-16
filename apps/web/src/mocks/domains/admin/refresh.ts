import type { RefreshRun, RefreshState } from "@fpr/contracts";
import { refreshCap, refreshMs } from "../../magic.ts";
import { mockError } from "../../server/errors.ts";
import { mock } from "../../server/implementer.ts";
import { addDays, refreshInstants, timestamp } from "../../store/calendar.ts";
import { holdersNow } from "../../store/shares.ts";
import type { MockStore } from "../../store/types.ts";
import { needsAttention } from "./shares.ts";

// The price service's default schedule: every 30 minutes, 09:00 to 22:30,
// Monday to Friday.
const SCHEDULED_RUNS = 28;

type RunOutcome = { calls: number; priced: number; failures: number };

function scheduleAround(store: MockStore): number[] {
  const { today } = store.calendar;
  return Array.from({ length: 15 }, (_, index) =>
    refreshInstants(addDays(today, index - 7), SCHEDULED_RUNS),
  ).flat();
}

function runOutcome(store: MockStore): RunOutcome {
  const held = store.shares.filter(
    (share) => share.kind === "market" && holdersNow(store, share).length > 0,
  );
  const failures = held.filter((share) => needsAttention(store, share)).length;
  return { calls: held.length, priced: held.length - failures, failures };
}

function toRun(
  { priced, failures }: RunOutcome,
  trigger: RefreshRun["trigger"],
  finishedMs: number,
): RefreshRun {
  return {
    trigger,
    status: failures === 0 ? "succeeded" : priced === 0 ? "failed" : "partial",
    startedAt: timestamp(finishedMs - refreshMs),
    finishedAt: timestamp(finishedMs),
    sharesPriced: priced,
    closesStored: 0,
    failures,
  };
}

function refreshState(store: MockStore): RefreshState {
  const { nowMs, today } = store.calendar;
  const { count, lastRunMs } = store.refreshes;
  const outcome = runOutcome(store);
  const schedule = scheduleAround(store);
  const lastScheduled = schedule.findLast((atMs) => atMs <= nowMs);
  const scheduledToday = refreshInstants(today, SCHEDULED_RUNS).filter(
    (atMs) => atMs <= nowMs,
  );
  const byAdmin = lastRunMs !== null && lastRunMs >= (lastScheduled ?? 0);
  const lastMs = byAdmin ? lastRunMs : lastScheduled;
  // The day's cap leaves room for `refreshCap` runs by the admin, so the cap
  // reads as the refusal does.
  const calls = Math.max(outcome.calls, 1);
  const callsToday = (scheduledToday.length + count) * calls;
  const callsLeft = (refreshCap - count) * calls;
  return {
    lastRunAt: lastMs === undefined ? null : timestamp(lastMs),
    lastResult:
      lastMs === undefined
        ? null
        : toRun(outcome, byAdmin ? "request" : "schedule", lastMs),
    nextRunAt: timestamp(schedule.find((atMs) => atMs > nowMs) ?? nowMs),
    runsToday: scheduledToday.length + count,
    cap: { callLimit: callsToday + callsLeft, callsToday, callsLeft },
  };
}

/** A refresh now, refused while one runs, past `refreshCap`, or while the price service is down; and the refresh's state. */
export const refreshRoutes = {
  refreshPrices: mock.admin.refreshPrices.handler(async ({ context }) => {
    const { store } = context;
    const { refreshes } = store;
    if (refreshes.offline) {
      throw mockError("provider_unavailable");
    }
    if (refreshes.running) {
      throw mockError("refresh_running");
    }
    if (refreshes.count >= refreshCap) {
      throw mockError("call_budget_used");
    }
    refreshes.running = true;
    await new Promise((resolve) => setTimeout(resolve, refreshMs));
    refreshes.running = false;
    refreshes.count += 1;
    refreshes.lastRunMs = store.calendar.nowMs;
    return {
      sharesPriced: runOutcome(store).priced,
      finishedAt: timestamp(refreshes.lastRunMs),
    };
  }),

  refreshState: mock.admin.refreshState.handler(({ context }) => {
    if (context.store.refreshes.offline) {
      throw mockError("provider_unavailable");
    }
    return refreshState(context.store);
  }),
};
