import type { Id } from "@fpr/contracts";
import { closeAt, dayOf } from "./calendar.ts";
import { Big, zero } from "./decimal.ts";
import type {
  MockStore,
  StoredCash,
  StoredChange,
  StoredPrice,
  StoredShare,
} from "./types.ts";

/**
 * The price a share is valued at at a moment: its latest price then. Before
 * its first price, that first price; `null` while it has none.
 */
export function pricePointAt(
  share: StoredShare,
  atMs: number,
): StoredPrice | null {
  const { prices } = share;
  return prices[Math.max(lastIndexAt(prices, atMs), 0)] ?? null;
}

function lastIndexAt(items: readonly { atMs: number }[], atMs: number): number {
  let low = 0;
  let high = items.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if ((items[middle]?.atMs ?? Number.POSITIVE_INFINITY) <= atMs) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return found;
}

export function priceAt(share: StoredShare, atMs: number): Big | null {
  const point = pricePointAt(share, atMs);
  return point === null ? null : new Big(point.priceEur);
}

/** One unit's value at the close of a change's day: the latest price so far for today's. */
export function dayPrice(share: StoredShare, atMs: number): Big | null {
  return priceAt(share, closeAt(dayOf(atMs)));
}

export function shareOf(
  store: MockStore,
  shareId: Id,
): StoredShare | undefined {
  return store.shares.find((share) => share.id === shareId);
}

/** A person's share changes, oldest first. */
export function changesOf(store: MockStore, userId: Id): StoredChange[] {
  return store.entries
    .filter(
      (entry): entry is StoredChange =>
        entry.type === "change" && entry.userId === userId,
    )
    .sort((a, b) => a.atMs - b.atMs);
}

/** A person's cash balances, oldest first. */
export function cashOf(store: MockStore, userId: Id): StoredCash[] {
  return store.entries
    .filter(
      (entry): entry is StoredCash =>
        entry.type === "cash" && entry.userId === userId,
    )
    .sort((a, b) => a.atMs - b.atMs);
}

/** What each share's changes add up to at a moment, without the zeros. */
export function quantitiesAt(
  changes: readonly StoredChange[],
  atMs: number,
): Map<Id, Big> {
  const held = new Map<Id, Big>();
  for (const change of changes) {
    if (change.atMs > atMs) {
      break;
    }
    held.set(
      change.shareId,
      (held.get(change.shareId) ?? zero).plus(change.quantityDelta),
    );
  }
  for (const [shareId, quantity] of held) {
    if (quantity.eq(0)) {
      held.delete(shareId);
    }
  }
  return held;
}

export function cashAt(cash: readonly StoredCash[], atMs: number): Big {
  const latest = cash[lastIndexAt(cash, atMs)];
  return latest === undefined ? zero : new Big(latest.amountEur);
}

export type Holding = {
  share: StoredShare;
  quantity: Big;
  valueEur: Big | null;
};

/**
 * A person's balance at a moment: each holding at its price then, plus cash.
 * A held share with no price yet is left out, and marks it incomplete.
 */
export function valuationAt(store: MockStore, userId: Id, atMs: number) {
  const holdings: Holding[] = [];
  let sharesEur = zero;
  for (const [shareId, quantity] of quantitiesAt(
    changesOf(store, userId),
    atMs,
  )) {
    const share = shareOf(store, shareId);
    if (share === undefined) {
      continue;
    }
    const price = priceAt(share, atMs);
    const valueEur = price === null ? null : price.times(quantity);
    sharesEur = valueEur === null ? sharesEur : sharesEur.plus(valueEur);
    holdings.push({ share, quantity, valueEur });
  }
  const cashEur = cashAt(cashOf(store, userId), atMs);
  return {
    holdings,
    sharesEur,
    cashEur,
    balanceEur: sharesEur.plus(cashEur),
    incomplete: holdings.some((holding) => holding.valueEur === null),
  };
}

export type Valuation = ReturnType<typeof valuationAt>;

/**
 * The money a person added, minus the money taken out, up to any moment: each
 * share change at its share's value at its day's close, with no price
 * counting as zero, plus the cash then, which is the sum of every change of
 * cash balance. The changes are summed once, so a series reads every point
 * from the same running totals.
 */
export function flowsOf(store: MockStore, userId: Id): (atMs: number) => Big {
  const shares = new Map(store.shares.map((share) => [share.id, share]));
  let total = zero;
  const totals = changesOf(store, userId).map((change) => {
    const share = shares.get(change.shareId);
    const price = share === undefined ? null : dayPrice(share, change.atMs);
    total = total.plus(price?.times(change.quantityDelta) ?? zero);
    return { atMs: change.atMs, total };
  });
  const cash = cashOf(store, userId);
  return (atMs) =>
    cashAt(cash, atMs).plus(totals[lastIndexAt(totals, atMs)]?.total ?? zero);
}

/** A person's holdings now, at their latest prices, largest first, unpriced last. */
export function holdingsNow(store: MockStore, userId: Id) {
  const valuation = valuationAt(store, userId, store.calendar.nowMs);
  const value = (holding: Holding) => holding.valueEur ?? new Big(-1);
  return {
    ...valuation,
    holdings: valuation.holdings.toSorted(
      (a, b) =>
        value(b).cmp(value(a)) || a.share.name.localeCompare(b.share.name),
    ),
  };
}
