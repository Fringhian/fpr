import type { AdminShare, AdminShareGroups } from "@fpr/contracts";
import { mockError } from "../../server/errors.ts";
import { mock, viewerOf } from "../../server/implementer.ts";
import {
  addDays,
  closeAt,
  timestamp,
  tradingDayOnOrBefore,
} from "../../store/calendar.ts";
import { toPerson } from "../../store/people.ts";
import {
  holdersNow,
  latestPrice,
  requireShare,
  toShareSummary,
} from "../../store/shares.ts";
import type { MockStore, StoredShare } from "../../store/types.ts";

function toAdminShare(store: MockStore, share: StoredShare): AdminShare {
  return {
    ...toShareSummary(share),
    exchange: share.exchange,
    addedAt: timestamp(share.addedAtMs),
    latestPrice: latestPrice(share, store.calendar.nowMs),
    holders: holdersNow(store, share).map(toPerson),
    hasShareChanges: store.entries.some(
      (entry) => entry.type === "change" && entry.shareId === share.id,
    ),
  };
}

/** A held market share with no price, or no close in the last 5 trading days. */
export function needsAttention(store: MockStore, share: StoredShare): boolean {
  let since = store.calendar.closesThrough;
  for (let day = 0; day < 4; day += 1) {
    since = tradingDayOnOrBefore(addDays(since, -1));
  }
  const lastClose = share.prices.findLast((price) => price.source === "close");
  return lastClose === undefined || lastClose.atMs < closeAt(since);
}

function groups(store: MockStore): AdminShareGroups {
  const result: AdminShareGroups = {
    needsAttention: [],
    tracked: [],
    manual: [],
    notHeld: [],
  };
  for (const share of store.shares) {
    const view = toAdminShare(store, share);
    const group =
      share.kind === "manual"
        ? "manual"
        : view.holders.length === 0
          ? "notHeld"
          : needsAttention(store, share)
            ? "needsAttention"
            : "tracked";
    result[group].push(view);
  }
  return result;
}

/** The tracked shares: their groups, and making one manual. */
export const adminShareRoutes = {
  shares: mock.admin.shares.handler(({ context }) => groups(context.store)),

  makeManual: mock.admin.makeManual.handler(({ context, input }) => {
    const { store } = context;
    const viewer = viewerOf(context);
    const share = requireShare(store, input.id, () => mockError("not_found"));
    if (
      share.kind !== "market" ||
      holdersNow(store, share).length === 0 ||
      !needsAttention(store, share)
    ) {
      throw mockError("share_not_needing_attention");
    }
    const latest = share.prices.at(-1);
    const first =
      latest ??
      (input.at === undefined || input.priceEur === undefined
        ? undefined
        : { atMs: Date.parse(input.at), priceEur: input.priceEur });
    if (first === undefined) {
      throw mockError("invalid_request", {
        issues: [{ path: ["priceEur"], code: "custom" }],
      });
    }
    if (first.atMs > store.calendar.nowMs) {
      throw mockError("future_moment");
    }
    share.kind = "manual";
    share.symbol = null;
    share.prices = [
      ...share.prices.filter((price) => price !== latest),
      { ...first, source: "manual", enteredBy: viewer.id },
    ];
    share.valueEvents.push({
      id: crypto.randomUUID(),
      atMs: first.atMs,
      madeBy: viewer.id,
      madeAtMs: store.calendar.nowMs,
      priceEur: first.priceEur,
      previousPriceEur: null,
    });
    return toAdminShare(store, share);
  }),
};
