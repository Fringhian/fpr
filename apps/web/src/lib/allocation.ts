import Big from "big.js";
import type { Decimal } from "./format";

/** A holding as the allocation reads it: the API's share and its weight in percent of the balance. */
export interface AllocationHolding {
  /** The share's id, unique in the portfolio. */
  id: string;
  /** The share's name. */
  name: string;
  /** Its weight in percent of the balance, or `null` while its price is pending. */
  weight: Decimal | null;
}

/** One part of the allocation, its weight in percent with one decimal. */
export type AllocationPart =
  | {
      kind: "share";
      id: string;
      name: string;
      weight: Decimal;
      /** How much of the person's colour it is drawn with, in percent, the rest being the surface. */
      tone: number;
    }
  | {
      kind: "other";
      /** How many shares it folds. */
      count: number;
      weight: Decimal;
      tone: number;
    }
  | { kind: "cash"; weight: Decimal };

/** The shares named one by one; the rest fold into "Other". */
export const NAMED_SHARES = 5;

/** The tone of the biggest share, and of the smallest coloured part. */
export const STRONGEST_TONE = 100;
export const LIGHTEST_TONE = 34;

/** Tenths of a percent in the whole: the key's weights add up to 100.0 %. */
const WHOLE = 1000;

const ZERO = new Big(0);

/** A part before rounding, with its weight as given. */
type Slice =
  | { kind: "share"; raw: Big; holding: AllocationHolding }
  | { kind: "other"; raw: Big; count: number }
  | { kind: "cash"; raw: Big };

/** A weight that counts: above zero, or zero when pending, not above it, or not a decimal. */
function positive(weight: Decimal | null): Big {
  if (weight === null) return ZERO;
  let value: Big;
  try {
    value = new Big(weight);
  } catch {
    return ZERO;
  }
  return value.gt(ZERO) ? value : ZERO;
}

/**
 * Rounds each slice to tenths of a percent of their total so they add up to
 * exactly 100.0 %: each gets its floor, then the biggest remainders get the
 * tenths left over (the largest remainder method). Every step is exact: the
 * floor and the remainder come from the integer division of `raw × WHOLE` by
 * the total.
 */
function tenths(raws: readonly Big[]): Big[] {
  const total = raws.reduce((sum, raw) => sum.plus(raw), ZERO);
  const scaled = raws.map((raw) => raw.times(WHOLE));
  const remainders = scaled.map((value) => value.mod(total));
  const floors = scaled.map((value, index) =>
    value.minus(remainders[index] ?? ZERO).div(total),
  );
  let left = floors.reduce((rest, floor) => rest.minus(floor), new Big(WHOLE));
  const order = remainders
    .map((remainder, index) => ({ index, remainder }))
    .toSorted((a, b) => b.remainder.cmp(a.remainder) || a.index - b.index);
  for (const { index } of order) {
    if (left.lte(ZERO)) break;
    floors[index] = (floors[index] ?? ZERO).plus(1);
    left = left.minus(1);
  }
  return floors;
}

/** The tone of the coloured part at `rank` among `count`: even steps from the strongest to the lightest. */
export function toneAt(rank: number, count: number): number {
  if (count <= 1) return STRONGEST_TONE;
  const step = (STRONGEST_TONE - LIGHTEST_TONE) / (count - 1);
  return Math.round(STRONGEST_TONE - rank * step);
}

/**
 * How a portfolio splits: its priced shares, biggest first, then "Other",
 * which folds every share past the fifth, then the cash. Each weight is in
 * percent of their total, with one decimal, and together they add up to
 * 100.0 %. Each coloured part is lighter than the one before it. A pending
 * share (no weight), a weight of zero, and no cash are left out; with nothing
 * left, the allocation is empty.
 */
export function allocate(
  holdings: readonly AllocationHolding[],
  cashWeight: Decimal | null,
): AllocationPart[] {
  const shares = holdings
    .map((holding) => ({ holding, raw: positive(holding.weight) }))
    .filter(({ raw }) => raw.gt(ZERO))
    .toSorted((a, b) => b.raw.cmp(a.raw));
  const named = shares.slice(0, NAMED_SHARES);
  const folded = shares.slice(NAMED_SHARES);
  const cash = positive(cashWeight);

  const slices: Slice[] = named.map(({ holding, raw }) => ({
    kind: "share",
    raw,
    holding,
  }));
  if (folded.length > 0) {
    slices.push({
      kind: "other",
      raw: folded.reduce((sum, { raw }) => sum.plus(raw), ZERO),
      count: folded.length,
    });
  }
  if (cash.gt(ZERO)) {
    slices.push({ kind: "cash", raw: cash });
  }
  if (slices.length === 0) return [];

  const rounded = tenths(slices.map(({ raw }) => raw));
  const coloured = slices.filter(({ kind }) => kind !== "cash").length;
  return slices.map((slice, index): AllocationPart => {
    const weight = (rounded[index] ?? ZERO).div(10).toFixed(1);
    if (slice.kind === "cash") return { kind: "cash", weight };
    const tone = toneAt(index, coloured);
    if (slice.kind === "other") {
      return { kind: "other", count: slice.count, weight, tone };
    }
    const { id, name } = slice.holding;
    return { kind: "share", id, name, weight, tone };
  });
}
