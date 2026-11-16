import type { Id } from "@fpr/contracts";
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
  let low = 0;
  let high = prices.length - 1;
  let found = -1;
  while (low <= high) {
    const middle = (low + high) >> 1;
    if ((prices[middle]?.atMs ?? Number.POSITIVE_INFINITY) <= atMs) {
      found = middle;
      low = middle + 1;
    } else {
      high = middle - 1;
    }
  }
  return prices[Math.max(found, 0)] ?? null;
}

export function priceAt(share: StoredShare, atMs: number): Big | null {
  const point = pricePointAt(share, atMs);
  return point === null ? null : new Big(point.priceEur);
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
  const latest = cash.findLast((balance) => balance.atMs <= atMs);
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
