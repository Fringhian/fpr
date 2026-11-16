import type {
  Decimal,
  Id,
  MadeBy,
  PortfolioCashBalance,
  PortfolioChange,
  PortfolioLogEntry,
} from "@fpr/contracts";
import { Big, plain, ratio, zero } from "./decimal.ts";
import { personOf } from "./people.ts";
import { toShareSummary } from "./shares.ts";
import type {
  MockStore,
  StoredCash,
  StoredChange,
  StoredEntry,
} from "./types.ts";
import { pricePointAt, shareOf, valuationAt } from "./valuation.ts";

function madeBy(store: MockStore, id: Id | null): MadeBy {
  const person = id === null ? undefined : personOf(store, id);
  return person === undefined
    ? null
    : { id: person.id, displayName: person.displayName };
}

export function toChange(
  store: MockStore,
  change: StoredChange,
): PortfolioChange {
  const share = shareOf(store, change.shareId);
  if (share === undefined) {
    throw new Error(`Share ${change.shareId} is missing`);
  }
  return {
    type: "change",
    id: change.id,
    share: toShareSummary(share),
    quantityDelta: change.quantityDelta,
    effectiveAt: change.effectiveAt,
    madeBy: madeBy(store, change.madeBy),
  };
}

export function toCash(
  store: MockStore,
  cash: StoredCash,
): PortfolioCashBalance {
  return {
    type: "cash",
    id: cash.id,
    amountEur: cash.amountEur,
    effectiveAt: cash.effectiveAt,
    madeBy: madeBy(store, cash.madeBy),
  };
}

/** A person's entries of one type up to and including `entry`, in the log's order, oldest first. */
function upTo<Entry extends StoredEntry>(
  store: MockStore,
  entry: Entry,
  same: (candidate: StoredEntry) => candidate is Entry,
): Entry[] {
  const ordered = store.entries
    .filter(
      (candidate): candidate is Entry =>
        candidate.userId === entry.userId && same(candidate),
    )
    .sort((a, b) => a.atMs - b.atMs);
  return ordered.slice(0, ordered.indexOf(entry) + 1);
}

/** An entry with what it changed: the quantity held just after a change, the cash just before a balance. */
export function toLogEntry(
  store: MockStore,
  entry: StoredEntry,
): PortfolioLogEntry {
  if (entry.type === "cash") {
    const before = upTo(
      store,
      entry,
      (c): c is StoredCash => c.type === "cash",
    ).at(-2);
    return {
      ...toCash(store, entry),
      previousAmountEur: before?.amountEur ?? null,
    };
  }
  const changes = upTo(
    store,
    entry,
    (c): c is StoredChange =>
      c.type === "change" && c.shareId === entry.shareId,
  );
  return {
    ...toChange(store, entry),
    quantityAfter: plain(
      changes.reduce((sum, change) => sum.plus(change.quantityDelta), zero),
    ),
  };
}

/**
 * The weight of an entry in its holder's balance at its moment, in percent:
 * a change's quantity at the share's price then, or a cash balance's amount.
 * What an anonymous viewer sees in place of its quantity or cash. `null`
 * without a price then, or while the balance is zero or less.
 */
export function entryWeight(
  store: MockStore,
  entry: StoredEntry,
): Decimal | null {
  const { balanceEur } = valuationAt(store, entry.userId, entry.atMs);
  if (balanceEur.lte(0)) {
    return null;
  }
  if (entry.type === "cash") {
    return ratio(new Big(entry.amountEur), balanceEur);
  }
  const share = shareOf(store, entry.shareId);
  const price = share === undefined ? null : pricePointAt(share, entry.atMs);
  return price === null || price.atMs > entry.atMs
    ? null
    : ratio(
        new Big(price.priceEur).times(entry.quantityDelta).abs(),
        balanceEur,
      );
}

/** Records each entry's weight, which replaces its quantity for an anonymous viewer. */
export function weighEntries(
  store: MockStore,
  context: {
    viewer: { role: string } | null;
    quantityWeights: Map<Id, string>;
  },
  entries: readonly StoredEntry[],
): void {
  if (context.viewer?.role !== "anonymous") {
    return;
  }
  for (const entry of entries) {
    const weight = entryWeight(store, entry);
    if (weight !== null) {
      context.quantityWeights.set(entry.id, weight);
    }
  }
}
