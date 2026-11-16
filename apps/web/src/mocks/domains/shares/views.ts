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
import { Big, money, plain, ratio } from "../../store/decimal.ts";
import { gainSinceBought, toGain } from "../../store/gain.ts";
import { hasPortfolio, racers, toPerson } from "../../store/people.ts";
import { raceWindow, windowInstants } from "../../store/series.ts";
import {
  firstPriceDay,
  holdersNow,
  latestPrice,
  periodPriceChange,
  priceSeries,
  shareWindow,
  toShareSummary,
} from "../../store/shares.ts";
import type { MockPerson, MockStore, StoredShare } from "../../store/types.ts";
import { changesOf, holdingsNow, priceAt } from "../../store/valuation.ts";

function quote(
  store: MockStore,
  share: StoredShare,
  period: Period,
): ShareQuote {
  const now = store.calendar.nowMs;
  return {
    ...toShareSummary(share),
    latestPrice: latestPrice(share, now),
    change: periodPriceChange(share, period, {
      window: raceWindow(store, period),
      endMs: now,
    }),
  };
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
  const { holdings, balanceEur } = holdingsNow(store, userId);
  const holding = holdings.find((candidate) => candidate.share.id === share.id);
  if (holding === undefined) {
    return null;
  }
  const { valueEur } = holding;
  const price = priceAt(share, store.calendar.nowMs);
  const changes = changesOf(store, userId).filter(
    (change) => change.shareId === share.id,
  );
  return {
    quantity: plain(holding.quantity),
    valueEur: valueEur === null ? null : money(valueEur),
    weight: valueEur === null ? null : ratio(valueEur, balanceEur),
    gain:
      price === null ? null : toGain(gainSinceBought(share, changes, price)),
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

/**
 * Each member with changes on a share, with their position now and their
 * changes, largest first. A member who sold it all holds zero, with no value
 * or gain.
 */
export function holdersOf(store: MockStore, share: StoredShare): ShareHolder[] {
  const holders = racers(store).flatMap((person) => {
    const changes = changesOf(store, person.id).filter(
      (change) => change.shareId === share.id,
    );
    if (changes.length === 0) {
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
  const value = (holder: ShareHolder) => new Big(holder.valueEur ?? -1);
  return holders.sort((a, b) => value(b).cmp(value(a)));
}
