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

/** A part before rounding, with its weight as given. */
type Slice =
  | { kind: "share"; raw: number; holding: AllocationHolding }
  | { kind: "other"; raw: number; count: number }
  | { kind: "cash"; raw: number };

function positive(weight: Decimal | null): number {
  const value = weight === null ? 0 : Number(weight);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

/**
 * Rounds each slice to tenths of a percent of their total so they add up to
 * exactly 100.0 %: each gets its floor, then the biggest remainders get the
 * tenths left over (the largest remainder method).
 */
function tenths(raws: readonly number[]): number[] {
  const total = raws.reduce((sum, raw) => sum + raw, 0);
  const exact = raws.map((raw) => (raw / total) * WHOLE);
  const floors = exact.map(Math.floor);
  let left = WHOLE - floors.reduce((sum, floor) => sum + floor, 0);
  const order = exact
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .toSorted((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const { index } of order) {
    if (left === 0) break;
    floors[index] = (floors[index] ?? 0) + 1;
    left -= 1;
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
    .filter(({ raw }) => raw > 0)
    .toSorted((a, b) => b.raw - a.raw);
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
      raw: folded.reduce((sum, { raw }) => sum + raw, 0),
      count: folded.length,
    });
  }
  if (cash > 0) {
    slices.push({ kind: "cash", raw: cash });
  }
  if (slices.length === 0) return [];

  const rounded = tenths(slices.map(({ raw }) => raw));
  const coloured = slices.filter(({ kind }) => kind !== "cash").length;
  return slices.map((slice, index): AllocationPart => {
    const weight = ((rounded[index] ?? 0) / 10).toFixed(1);
    if (slice.kind === "cash") return { kind: "cash", weight };
    const tone = toneAt(index, coloured);
    if (slice.kind === "other") {
      return { kind: "other", count: slice.count, weight, tone };
    }
    const { id, name } = slice.holding;
    return { kind: "share", id, name, weight, tone };
  });
}
