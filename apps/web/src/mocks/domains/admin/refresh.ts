import type { RefreshRun, RefreshState } from "@fpr/contracts";
import { refreshCap, refreshMs } from "../../magic.ts";
import { mockError } from "../../server/errors.ts";
import { mock } from "../../server/implementer.ts";
import {
  addDays,
  isTradingDay,
  localInstant,
  timestamp,
} from "../../store/calendar.ts";
import { holdersNow } from "../../store/shares.ts";
import type { MockStore } from "../../store/types.ts";
import { needsAttention } from "./shares.ts";

/** The price service's default schedule on a day: every 30 minutes, 09:00 to 22:30, Monday to Friday. */
function scheduledRuns(day: string): number[] {
  if (!isTradingDay(day)) {
    return [];
  }
  return Array.from({ length: 28 }, (_, step) => {
    const minutes = 9 * 60 + step * 30;
    const time = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}:00`;
    return localInstant(day, time);
  });
}

/** The scheduled runs within a week of today, oldest first. */
function scheduleAround(store: MockStore): number[] {
  const { today } = store.calendar;
  return Array.from({ length: 15 }, (_, index) =>
    scheduledRuns(addDays(today, index - 7)),
  ).flat();
}

/**
 * What a run does with the held market shares: one provider call each, and a
 * price for those whose closes are current; the others fail.
 */
function runOutcome(store: MockStore) {
  const held = store.shares.filter(
    (share) => share.kind === "market" && holdersNow(store, share).length > 0,
  );
  const failures = held.filter((share) => needsAttention(store, share)).length;
  return { calls: held.length, priced: held.length - failures, failures };
}

function toRun(
  store: MockStore,
  trigger: RefreshRun["trigger"],
  finishedMs: number,
): RefreshRun {
  const { priced, failures } = runOutcome(store);
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

/**
 * The refresh's state from the schedule and the admin's runs. The day's cap
 * leaves room for `refreshCap` runs by the admin, so the cap reads as the
 * refusal does.
 */
function refreshState(store: MockStore): RefreshState {
  const { nowMs, today } = store.calendar;
  const { count, lastRunMs } = store.refreshes;
  const schedule = scheduleAround(store);
  const lastScheduled = schedule.findLast((atMs) => atMs <= nowMs);
  const scheduledToday = scheduledRuns(today).filter((atMs) => atMs <= nowMs);
  const byAdmin = lastRunMs !== null && lastRunMs >= (lastScheduled ?? 0);
  const lastMs = byAdmin ? lastRunMs : lastScheduled;
  const calls = Math.max(runOutcome(store).calls, 1);
  const callsToday = (scheduledToday.length + count) * calls;
  const callsLeft = (refreshCap - count) * calls;
  return {
    lastRunAt: lastMs === undefined ? null : timestamp(lastMs),
    lastResult:
      lastMs === undefined
        ? null
        : toRun(store, byAdmin ? "request" : "schedule", lastMs),
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
