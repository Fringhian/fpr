import type { ChangeAtDayValue } from "@fpr/db";
import { Big, type GainAmount } from "./decimal.js";

const zero = new Big(0);

/** What a person's changes on one share add up to at a moment, or now with `null`. */
export function quantityAt(
  changes: readonly ChangeAtDayValue[],
  at: Date | null,
): Big {
  return changes
    .filter((change) => at === null || change.effectiveAt <= at)
    .reduce((sum, change) => sum.plus(change.quantityDelta), zero);
}

/**
 * A holding's gain over a period, from a person's changes on one share: its
 * value at the end, minus its value at the start, minus the shares added,
 * plus the shares removed, each at its day's close. The percentage is
 * measured against the value at the start plus the shares added. `null`
 * without a price at the end, or at the start while something was held.
 */
export function periodGain({
  changes,
  from,
  to,
  startPrice,
  endPrice,
}: {
  changes: readonly ChangeAtDayValue[];
  from: Date;
  /** The end, or now with `null`. */
  to: Date | null;
  startPrice: string | null;
  endPrice: string | null;
}): GainAmount | null {
  const held = changes.filter((c) => to === null || c.effectiveAt <= to);
  const atStart = quantityAt(held, from);
  if (endPrice === null || (startPrice === null && !atStart.eq(0))) {
    return null;
  }
  const startValue = atStart.eq(0) ? zero : atStart.times(startPrice ?? 0);
  let eur = quantityAt(held, null).times(endPrice).minus(startValue);
  let base = startValue;
  for (const change of held) {
    if (change.effectiveAt <= from || change.dayPriceEur === null) {
      continue;
    }
    const flow = new Big(change.quantityDelta).times(change.dayPriceEur);
    eur = eur.minus(flow);
    base = flow.gt(0) ? base.plus(flow) : base;
  }
  return { eur, base };
}

/**
 * A holding's gain since bought: its value minus its cost. A purchase costs
 * its quantity at its day's close, and a sale removes cost at the holding's
 * average cost. The percentage is measured against the cost.
 */
export function gainSinceBought(
  changes: readonly ChangeAtDayValue[],
  price: string,
): GainAmount {
  let quantity = zero;
  let cost = zero;
  for (const change of changes) {
    const delta = new Big(change.quantityDelta);
    if (delta.gt(0)) {
      cost = cost.plus(delta.times(change.dayPriceEur ?? price));
    } else if (quantity.gt(0)) {
      cost = cost.times(quantity.plus(delta)).div(quantity);
    }
    quantity = quantity.plus(delta);
  }
  return { eur: quantity.times(price).minus(cost), base: cost };
}

/** Changes grouped by `key`, each list oldest first as given. */
export function groupChanges(
  changes: readonly ChangeAtDayValue[],
  key: (change: ChangeAtDayValue) => string,
): Map<string, ChangeAtDayValue[]> {
  const groups = new Map<string, ChangeAtDayValue[]>();
  for (const change of changes) {
    groups.set(key(change), [...(groups.get(key(change)) ?? []), change]);
  }
  return groups;
}
