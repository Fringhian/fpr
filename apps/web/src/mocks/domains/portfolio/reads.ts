import type { PortfolioHoldingAtQuery, PortfolioLog } from "@fpr/contracts";
import { mockError } from "../../server/errors.ts";
import { mock, type PipelineContext } from "../../server/implementer.ts";
import { money, plain, ratio, zero } from "../../store/decimal.ts";
import { toLogEntry, weighEntries } from "../../store/log.ts";
import { portfolioView } from "../../store/portfolio.ts";
import {
  raceWindow,
  toSeriesPoints,
  windowPoints,
} from "../../store/series.ts";
import { requireShare, toShareSummary } from "../../store/shares.ts";
import type { MockStore, StoredEntry } from "../../store/types.ts";
import {
  cashOf,
  changesOf,
  priceAt,
  quantitiesAt,
  valuationAt,
} from "../../store/valuation.ts";
import { portfolioOwner } from "./owner.ts";

/** Newest first, by moment then id. */
function newestFirst(a: StoredEntry, b: StoredEntry): number {
  return b.atMs - a.atMs || b.id.localeCompare(a.id);
}

function cursorOf(entry: StoredEntry): string {
  return `${entry.atMs}_${entry.id}`;
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

function holdingAt(store: MockStore, input: PortfolioHoldingAtQuery) {
  const share = requireShare(store, input.shareId, () =>
    mockError("not_found"),
  );
  const atMs = Date.parse(input.at);
  const held = quantitiesAt(changesOf(store, input.userId), atMs).get(share.id);
  const value = held === undefined ? null : priceAt(share, atMs)?.times(held);
  const { balanceEur } = valuationAt(store, input.userId, atMs);
  return {
    share,
    quantity: held === undefined ? "0" : plain(held),
    weight: value == null ? null : ratio(value, balanceEur),
  };
}

/** A member's portfolio, its log, its balance over time, and a holding at a moment. */
export const portfolioReads = {
  get: mock.portfolio.get.handler(({ context, input }) => {
    portfolioOwner(context.store, input.userId);
    return portfolioView(context.store, input.userId, input.period);
  }),

  holdingAt: mock.portfolio.holdingAt.handler(({ context, input }) => {
    portfolioOwner(context.store, input.userId);
    const { share, quantity, weight } = holdingAt(context.store, input);
    if (weight !== null) {
      context.quantityWeights.set(share.id, weight);
    }
    return { share: toShareSummary(share), at: input.at, quantity };
  }),

  holdingHistory: mock.portfolio.holdingHistory.handler(
    ({ context, input }) => {
      const { store } = context;
      portfolioOwner(store, input.userId);
      const share = requireShare(store, input.shareId, () =>
        mockError("not_found"),
      );
      const window = raceWindow(store, input.period);
      const changes = changesOf(store, input.userId);
      const points = windowPoints(store, input.userId, window, {
        closesOnly: false,
      });
      return {
        share: toShareSummary(share),
        points: points.map(({ atMs, balanceEur }) => {
          const held = quantitiesAt(changes, atMs).get(share.id) ?? zero;
          const value = priceAt(share, atMs)?.times(held) ?? null;
          return {
            at: new Date(atMs).toISOString(),
            quantity: plain(held),
            valueEur: value === null ? null : money(value),
            weight: value === null ? null : ratio(value, balanceEur),
          };
        }),
      };
    },
  ),

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
      const window = raceWindow(store, input.period);
      const entries = store.entries
        .filter(
          (entry) =>
            entry.userId === input.userId && entry.atMs > window.startMs,
        )
        .sort((a, b) => a.atMs - b.atMs);
      weighEntries(store, context, entries);
      return {
        points: toSeriesPoints(
          windowPoints(store, input.userId, window, { closesOnly: false }),
        ),
        entries: entries.map((entry) => toLogEntry(store, entry)),
      };
    },
  ),
};
