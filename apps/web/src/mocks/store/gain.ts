import type { Gain } from "@fpr/contracts";
import { Big, money, percent, zero } from "./decimal.ts";
import type { StoredChange, StoredShare } from "./types.ts";
import { dayPrice, priceAt } from "./valuation.ts";

/** A gain in euros, and the amount its percentage is measured against. */
export type GainAmount = { eur: Big; base: Big };

export function toGain(gain: GainAmount): Gain {
  const inPercent = gainPercent(gain);
  return {
    eur: money(gain.eur),
    percent: inPercent === null ? null : percent(inPercent),
  };
}

/** The gain in percent, unrounded, or `null` while its base is zero or below. */
export function gainPercent({ eur, base }: GainAmount): Big | null {
  return base.gt(0) ? eur.div(base).times(100) : null;
}

/**
 * Each point's gain since the first, which it is measured from: the balance's
 * change minus the flows between them, so money added or taken out is no
 * gain. The percentage is Modified Dietz: the gain over the first balance plus
 * each flow weighted by the fraction of the span left after it. A flow is
 * dated at the first point it shows in.
 */
export function withGains<
  P extends { atMs: number; balanceEur: Big; flowsEur: Big },
>(points: readonly P[]): { point: P; gain: GainAmount }[] {
  const [first] = points;
  if (first === undefined) {
    return [];
  }
  // Σ Fᵢ·(tᵢ − t₀), so that Σ Fᵢ·(t − tᵢ)/(t − t₀) = added − timed/(t − t₀).
  let timed = zero;
  let previous = first.flowsEur;
  return points.map((point) => {
    const elapsed = point.atMs - first.atMs;
    timed = timed.plus(point.flowsEur.minus(previous).times(elapsed));
    previous = point.flowsEur;
    const added = point.flowsEur.minus(first.flowsEur);
    const weighted = elapsed === 0 ? added : added.minus(timed.div(elapsed));
    const gain = {
      eur: point.balanceEur.minus(first.balanceEur).minus(added),
      base: first.balanceEur.plus(weighted),
    };
    return { point, gain };
  });
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
