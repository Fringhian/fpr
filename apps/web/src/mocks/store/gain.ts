import type { Gain, Id } from "@fpr/contracts";
import { type Big, money, ratio, zero } from "./decimal.ts";
import type { MockStore, StoredChange } from "./types.ts";
import { priceAt, quantitiesAt, shareOf } from "./valuation.ts";

export type GainAmount = { eur: Big; base: Big };

/**
 * The gain of a person's holdings from `startMs` to `endMs`, from their
 * changes, oldest first: the value at the end, minus the value at the start,
 * minus the shares added, plus the shares removed, each at its moment's
 * price. Its base, for the percentage, is the value at the start plus the
 * shares added. A share with no price is left out, and `shareId` keeps one
 * share.
 */
export function gainBetween(
  store: MockStore,
  changes: readonly StoredChange[],
  startMs: number,
  endMs: number,
  shareId?: Id,
): GainAmount {
  const kept =
    shareId === undefined
      ? changes
      : changes.filter((change) => change.shareId === shareId);
  const atStart = quantitiesAt(kept, startMs);
  const atEnd = quantitiesAt(kept, endMs);
  let eur = zero;
  let base = zero;
  for (const id of new Set([...atStart.keys(), ...atEnd.keys()])) {
    const share = shareOf(store, id);
    const startPrice = share === undefined ? null : priceAt(share, startMs);
    const endPrice = share === undefined ? null : priceAt(share, endMs);
    if (startPrice === null || endPrice === null) {
      continue;
    }
    const startValue = startPrice.times(atStart.get(id) ?? zero);
    eur = eur.plus(endPrice.times(atEnd.get(id) ?? zero)).minus(startValue);
    base = base.plus(startValue);
  }
  for (const change of kept) {
    if (change.atMs <= startMs || change.atMs > endMs) {
      continue;
    }
    const share = shareOf(store, change.shareId);
    const price = share === undefined ? null : priceAt(share, change.atMs);
    if (price === null) {
      continue;
    }
    const flow = price.times(change.quantityDelta);
    eur = eur.minus(flow);
    base = flow.gt(0) ? base.plus(flow) : base;
  }
  return { eur, base };
}

export function toGain({ eur, base }: GainAmount): Gain {
  return { eur: money(eur), percent: ratio(eur, base) };
}

export function gainPercent({ eur, base }: GainAmount): Big | null {
  return base.eq(0) ? null : eur.div(base).times(100);
}
