import type { PortfolioLog } from "@fpr/contracts";
import { mockError } from "../../server/errors.ts";
import { mock, type PipelineContext } from "../../server/implementer.ts";
import { plain } from "../../store/decimal.ts";
import { firstEntryOn } from "../../store/people.ts";
import {
  entryWeight,
  portfolioView,
  toLogEntry,
} from "../../store/portfolio.ts";
import {
  periodWindow,
  seriesPoints,
  windowInstants,
} from "../../store/series.ts";
import { requireShare, toShareSummary } from "../../store/shares.ts";
import type { MockStore, StoredEntry } from "../../store/types.ts";
import { cashOf, changesOf, quantitiesAt } from "../../store/valuation.ts";
import { portfolioOwner } from "./owner.ts";

/** Newest first, by moment then id. */
function newestFirst(a: StoredEntry, b: StoredEntry): number {
  return b.atMs - a.atMs || b.id.localeCompare(a.id);
}

function cursorOf(entry: StoredEntry): string {
  return `${entry.atMs}_${entry.id}`;
}

/** Records each entry's weight, which replaces its quantity for an anonymous viewer. */
function weighEntries(
  store: MockStore,
  context: PipelineContext,
  entries: readonly StoredEntry[],
): void {
  if (context.viewer?.role === "anonymous") {
    for (const entry of entries) {
      context.quantityWeights.set(entry.id, entryWeight(store, entry));
    }
  }
}

function logPage(
  store: MockStore,
  context: PipelineContext,
  input: { userId: string; limit: number; before?: string | undefined },
): PortfolioLog {
  const all = store.entries
    .filter((entry) => entry.userId === input.userId)
    .sort(newestFirst);
  const start =
    input.before === undefined
      ? 0
      : all.findIndex((entry) => cursorOf(entry) === input.before) + 1;
  const page = all.slice(start, start + input.limit);
  const last = page.at(-1);
  weighEntries(store, context, page);
  return {
    entries: page.map((entry) => toLogEntry(store, entry)),
    nextBefore:
      last !== undefined && start + input.limit < all.length
        ? cursorOf(last)
        : null,
    total: all.length,
  };
}

/** A member's portfolio, its log, its balance over time, and a holding at a moment. */
export const portfolioReads = {
  get: mock.portfolio.get.handler(({ context, input }) => {
    portfolioOwner(context.store, input.userId);
    return portfolioView(context.store, input.userId, input.period);
  }),

  holdingAt: mock.portfolio.holdingAt.handler(({ context, input }) => {
    const { store } = context;
    portfolioOwner(store, input.userId);
    const share = requireShare(store, input.shareId, () =>
      mockError("not_found"),
    );
    const changes = changesOf(store, input.userId);
    const held = quantitiesAt(changes, Date.parse(input.at)).get(share.id);
    if (context.viewer?.role === "anonymous") {
      const latest = changes.findLast((change) => change.shareId === share.id);
      context.quantityWeights.set(
        share.id,
        latest === undefined ? "0" : entryWeight(store, latest),
      );
    }
    return {
      share: toShareSummary(share),
      at: input.at,
      quantity: held === undefined ? "0" : plain(held),
    };
  }),

  log: mock.portfolio.log.handler(({ context, input }) => {
    portfolioOwner(context.store, input.userId);
    return logPage(context.store, context, input);
  }),

  logEntry: mock.portfolio.logEntry.handler(({ context, input }) => {
    const { store } = context;
    portfolioOwner(store, input.userId);
    const entry = store.entries.find(
      ({ id, userId }) => id === input.entryId && userId === input.userId,
    );
    if (entry === undefined) {
      throw mockError("not_found");
    }
    weighEntries(store, context, [entry]);
    return toLogEntry(store, entry);
  }),

  cashAt: mock.portfolio.cashAt.handler(({ context, input }) => {
    portfolioOwner(context.store, input.userId);
    const cash = cashOf(context.store, input.userId).findLast(
      ({ atMs }) => atMs <= Date.parse(input.at),
    );
    return cash === undefined
      ? null
      : { amountEur: cash.amountEur, setAt: cash.effectiveAt };
  }),

  balanceHistory: mock.portfolio.balanceHistory.handler(
    ({ context, input }) => {
      const { store } = context;
      portfolioOwner(store, input.userId);
      const window = periodWindow(
        store,
        input.period,
        firstEntryOn(store, input.userId),
      );
      const entries = store.entries
        .filter(
          (entry) =>
            entry.userId === input.userId && entry.atMs > window.startMs,
        )
        .sort((a, b) => a.atMs - b.atMs);
      weighEntries(store, context, entries);
      return {
        points: seriesPoints(
          store,
          input.userId,
          window,
          windowInstants(store, window),
        ),
        entries: entries.map((entry) => toLogEntry(store, entry)),
      };
    },
  ),
};
