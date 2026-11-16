import type { Gain } from "@fpr/contracts";
import { closeAt, dayOf } from "./calendar.ts";
import { Big, money, ratio, zero } from "./decimal.ts";
import type { StoredChange, StoredShare } from "./types.ts";
import { priceAt } from "./valuation.ts";

/** A gain in euros, and the amount its percentage is measured against. */
export type GainAmount = { eur: Big; base: Big };

export function toGain({ eur, base }: GainAmount): Gain {
  return { eur: money(eur), percent: ratio(eur, base) };
}

/** The gain in percent, unrounded, or `null` while its base is zero. */
export function gainPercent({ eur, base }: GainAmount): Big | null {
  return base.eq(0) ? null : eur.div(base).times(100);
}

/** A balance's gain since the one it is measured from. */
export function balanceGain(from: Big, to: Big): GainAmount {
  return { eur: to.minus(from), base: from };
}

/** One unit's value at the close of a change's day: the latest price so far for today's. */
function dayPrice(share: StoredShare, atMs: number): Big | null {
  return priceAt(share, closeAt(dayOf(atMs)));
}

function quantityAt(changes: readonly StoredChange[], atMs: number): Big {
  return changes
    .filter((change) => change.atMs <= atMs)
    .reduce((sum, change) => sum.plus(change.quantityDelta), zero);
}

/**
 * A holding's gain over a period, from a person's changes on one share,
 * oldest first: its value at the end, minus its value at the start, minus the
 * shares added, plus the shares removed, each at its day's close. The
 * percentage is measured against the value at the start plus the shares
 * added. `null` without a price at the end, or at the start while something
 * was held.
 */
export function periodGain(
  share: StoredShare,
  changes: readonly StoredChange[],
  { fromMs, toMs }: { fromMs: number; toMs: number },
): GainAmount | null {
  const held = changes.filter((change) => change.atMs <= toMs);
  const atStart = quantityAt(held, fromMs);
  const startPrice = priceAt(share, fromMs);
  const endPrice = priceAt(share, toMs);
  if (endPrice === null || (startPrice === null && !atStart.eq(0))) {
    return null;
  }
  const startValue = atStart.eq(0) ? zero : atStart.times(startPrice ?? 0);
  let eur = quantityAt(held, toMs).times(endPrice).minus(startValue);
  let base = startValue;
  for (const change of held) {
    const price = dayPrice(share, change.atMs);
    if (change.atMs <= fromMs || price === null) {
      continue;
    }
    const flow = new Big(change.quantityDelta).times(price);
    eur = eur.minus(flow);
    base = flow.gt(0) ? base.plus(flow) : base;
  }
  return { eur, base };
}

/**
 * A holding's gain since bought: its value at `price` minus its cost. A
 * purchase costs its quantity at its day's close, and a sale removes cost at
 * the holding's average cost.
 */
export function gainSinceBought(
  share: StoredShare,
  changes: readonly StoredChange[],
  price: Big,
): GainAmount {
  let quantity = zero;
  let cost = zero;
  for (const change of changes) {
    const delta = new Big(change.quantityDelta);
    if (delta.gt(0)) {
      cost = cost.plus(delta.times(dayPrice(share, change.atMs) ?? price));
    } else if (quantity.gt(0)) {
      cost = cost.times(quantity.plus(delta)).div(quantity);
    }
    quantity = quantity.plus(delta);
  }
  return { eur: quantity.times(price).minus(cost), base: cost };
}
