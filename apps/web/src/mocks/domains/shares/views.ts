import type {
  Id,
  Period,
  Position,
  ShareDetail,
  ShareHolder,
  ShareListItem,
  ShareQuote,
} from "@fpr/contracts";
import { dayOf } from "../../store/calendar.ts";
import { money, plain, ratio } from "../../store/decimal.ts";
import { gainBetween, toGain } from "../../store/gain.ts";
import { hasPortfolio, racers, toPerson } from "../../store/people.ts";
import { periodWindow, windowInstants } from "../../store/series.ts";
import {
  firstPriceDay,
  latestPrice,
  priceChange,
  priceSeries,
  toShareSummary,
} from "../../store/shares.ts";
import type { MockPerson, MockStore, StoredShare } from "../../store/types.ts";
import { changesOf, valuationAt } from "../../store/valuation.ts";

/** A share's window: `all` starts before its first price. */
export function shareWindow(
  store: MockStore,
  share: StoredShare,
  period: Period,
) {
  return periodWindow(store, period, firstPriceDay(share));
}

function quote(
  store: MockStore,
  share: StoredShare,
  period: Period,
): ShareQuote {
  const now = store.calendar.nowMs;
  return {
    ...toShareSummary(share),
    latestPrice: latestPrice(share, now),
    change: priceChange(share, shareWindow(store, share, period).startMs, now),
  };
}

/** The racers holding a share now. */
function holdersNow(store: MockStore, share: StoredShare): MockPerson[] {
  return racers(store).filter((person) =>
    valuationAt(store, person.id, store.calendar.nowMs).holdings.some(
      (holding) => holding.share.id === share.id,
    ),
  );
}

export function listItem(
  store: MockStore,
  share: StoredShare,
  period: Period,
): ShareListItem {
  return {
    ...quote(store, share, period),
    series: priceSeries(
      share,
      windowInstants(store, shareWindow(store, share, period)),
    ),
    holders: holdersNow(store, share).map(toPerson),
  };
}

/** A person's position on a share now, its gain since they bought, or `null` with none. */
export function positionOf(
  store: MockStore,
  userId: Id,
  share: StoredShare,
): Position | null {
  const now = store.calendar.nowMs;
  const valuation = valuationAt(store, userId, now);
  const holding = valuation.holdings.find(
    (candidate) => candidate.share.id === share.id,
  );
  if (holding === undefined) {
    return null;
  }
  const { valueEur } = holding;
  return {
    quantity: plain(holding.quantity),
    valueEur: valueEur === null ? null : money(valueEur),
    weight: valueEur === null ? null : ratio(valueEur, valuation.balanceEur),
    gain:
      valueEur === null
        ? null
        : toGain(
            gainBetween(store, changesOf(store, userId), 0, now, share.id),
          ),
  };
}

export function shareDetail(
  store: MockStore,
  share: StoredShare,
  period: Period,
  viewer: MockPerson,
): ShareDetail {
  const firstHeld = store.entries
    .filter((entry) => entry.type === "change" && entry.shareId === share.id)
    .reduce(
      (first, entry) => Math.min(first, entry.atMs),
      Number.POSITIVE_INFINITY,
    );
  const pricesStart = firstPriceDay(share);
  const startsLate =
    share.kind === "market" &&
    pricesStart !== null &&
    firstHeld < Number.POSITIVE_INFINITY &&
    pricesStart > dayOf(firstHeld);
  return {
    ...quote(store, share, period),
    exchange: share.exchange,
    tradingCurrency: share.tradingCurrency,
    historyStartsOn: startsLate ? pricesStart : null,
    position: hasPortfolio(viewer) ? positionOf(store, viewer.id, share) : null,
  };
}

/** Each person with changes on a share, with their position now and their changes. */
export function holdersOf(store: MockStore, share: StoredShare): ShareHolder[] {
  return store.people.flatMap((person) => {
    const changes = changesOf(store, person.id).filter(
      (change) => change.shareId === share.id,
    );
    if (changes.length === 0 || !hasPortfolio(person)) {
      return [];
    }
    const position = positionOf(store, person.id, share) ?? {
      quantity: "0",
      valueEur: null,
      weight: null,
      gain: null,
    };
    return [
      {
        ...position,
        person: toPerson(person),
        changes: changes.map(({ id, quantityDelta, effectiveAt }) => ({
          id,
          quantityDelta,
          effectiveAt,
        })),
      },
    ];
  });
}
