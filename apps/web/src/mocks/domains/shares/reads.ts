import type { Period, ShareValueEvent } from "@fpr/contracts";
import { mockError } from "../../server/errors.ts";
import { mock, viewerOf } from "../../server/implementer.ts";
import { timestamp } from "../../store/calendar.ts";
import { personOf, toPerson } from "../../store/people.ts";
import { entryWeight } from "../../store/portfolio.ts";
import { priceSeries, requireShare } from "../../store/shares.ts";
import type {
  MockStore,
  StoredShare,
  StoredValueEvent,
} from "../../store/types.ts";
import { holdersOf, listItem, shareDetail, shareWindow } from "./views.ts";

function shareById(store: MockStore, id: string): StoredShare {
  return requireShare(store, id, () => mockError("not_found"));
}

/**
 * A share's chart points: every refresh and close after the period's start
 * for `1D` and `1W`, the closes otherwise, and none for a share nobody held.
 */
function chartPoints(store: MockStore, share: StoredShare, range: Period) {
  const held = store.entries.some(
    (entry) => entry.type === "change" && entry.shareId === share.id,
  );
  if (!held) {
    return [];
  }
  const window = shareWindow(store, share, range);
  const now = store.calendar.nowMs;
  const instants =
    range === "1D" || range === "1W"
      ? share.prices
          .filter((price) => price.atMs > window.startMs && price.atMs <= now)
          .map((price) => price.atMs)
      : [window.startMs, ...window.closes];
  return priceSeries(share, instants);
}

function toValueEvent(
  store: MockStore,
  event: StoredValueEvent,
): ShareValueEvent {
  const by = event.madeBy === null ? undefined : personOf(store, event.madeBy);
  const base = {
    id: event.id,
    at: timestamp(event.atMs),
    madeBy: by === undefined ? null : toPerson(by),
    madeAt: timestamp(event.madeAtMs),
  };
  if (event.previousPriceEur === null) {
    return {
      ...base,
      action: "added",
      priceEur: event.priceEur ?? "0",
      previousPriceEur: null,
    };
  }
  if (event.priceEur === null) {
    return {
      ...base,
      action: "deleted",
      priceEur: null,
      previousPriceEur: event.previousPriceEur,
    };
  }
  return {
    ...base,
    action: "edited",
    priceEur: event.priceEur,
    previousPriceEur: event.previousPriceEur,
  };
}

function matches(share: StoredShare, query: string): boolean {
  const needle = query.toLowerCase();
  return [share.name, share.isin, share.symbol ?? ""].some((field) =>
    field.toLowerCase().includes(needle),
  );
}

/** The stored shares, a share's page, its chart, holders and value points. */
export const shareReads = {
  search: mock.shares.search.handler(({ context, input }) => {
    const { store } = context;
    const shares = store.shares
      .filter((share) => matches(share, input.q))
      .map((share) => listItem(store, share, input.period))
      .sort(
        (a, b) =>
          b.holders.length - a.holders.length || a.name.localeCompare(b.name),
      );
    return { shares };
  }),

  get: mock.shares.get.handler(({ context, input }) =>
    shareDetail(
      context.store,
      shareById(context.store, input.id),
      input.period,
      viewerOf(context),
    ),
  ),

  prices: mock.shares.prices.handler(({ context, input }) => ({
    points: chartPoints(
      context.store,
      shareById(context.store, input.id),
      input.range,
    ),
  })),

  holders: mock.shares.holders.handler(({ context, input }) => {
    const { store } = context;
    const share = shareById(store, input.id);
    if (context.viewer?.role === "anonymous") {
      for (const entry of store.entries) {
        if (entry.type === "change" && entry.shareId === share.id) {
          context.quantityWeights.set(entry.id, entryWeight(store, entry));
        }
      }
    }
    return { holders: holdersOf(store, share) };
  }),

  values: mock.shares.values.handler(({ context, input }) => {
    const { store } = context;
    const share = shareById(store, input.id);
    const values = share.kind === "manual" ? share.prices.toReversed() : [];
    return {
      values: values.map((value) => {
        const by = value.enteredBy
          ? personOf(store, value.enteredBy)
          : undefined;
        return {
          at: timestamp(value.atMs),
          priceEur: value.priceEur,
          enteredBy: by === undefined ? null : toPerson(by),
        };
      }),
    };
  }),

  valueEvents: mock.shares.valueEvents.handler(({ context, input }) => {
    const { store } = context;
    const share = shareById(store, input.id);
    const events = share.valueEvents.toSorted(
      (a, b) => b.madeAtMs - a.madeAtMs,
    );
    return { events: events.map((event) => toValueEvent(store, event)) };
  }),
};
