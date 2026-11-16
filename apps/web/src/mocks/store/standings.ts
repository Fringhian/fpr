import type { Id, Period } from "@fpr/contracts";
import type { Big } from "./decimal.ts";
import { type GainAmount, gainPercent, periodGain, withGains } from "./gain.ts";
import { racers } from "./people.ts";
import {
  type BalancePoint,
  type PeriodWindow,
  raceWindow,
  windowPoints,
} from "./series.ts";
import type { MockPerson, MockStore, StoredShare } from "./types.ts";
import { changesOf, shareOf } from "./valuation.ts";

/** A member's result as of the last close. */
export type Standing = {
  person: MockPerson;
  /** Their closes from the period's start to the last close. */
  closes: BalancePoint[];
  end: BalancePoint;
  gain: GainAmount;
};

/**
 * Every member's balance and gain at the last close, measured from their
 * first close in the period, without the money added or taken out since. A
 * member with no close yet hasn't started.
 */
export function standingsAt(store: MockStore, period: Period) {
  const window = raceWindow(store, period);
  const standings: Standing[] = [];
  const notStarted: MockPerson[] = [];
  for (const person of racers(store)) {
    const closes = windowPoints(store, person.id, window, { closesOnly: true });
    const last = withGains(closes).at(-1);
    if (last === undefined) {
      notStarted.push(person);
    } else {
      standings.push({ person, closes, end: last.point, gain: last.gain });
    }
  }
  return { window, standings, notStarted };
}

/** A member's holding with the largest gain over the period, in percent. */
export type BestHolding = { share: StoredShare; gain: GainAmount };

/**
 * A member's holding with the largest gain in percent from the period's
 * start to the last close, among the shares they held over it.
 */
export function bestHolding(
  store: MockStore,
  userId: Id,
  window: PeriodWindow,
): BestHolding | null {
  const byShare = Map.groupBy(changesOf(store, userId), (c) => c.shareId);
  let best: (BestHolding & { percent: Big }) | null = null;
  for (const [shareId, changes] of byShare) {
    const share = shareOf(store, shareId);
    const gain =
      share === undefined
        ? null
        : periodGain(share, changes, {
            fromMs: window.startMs,
            toMs: window.lastCloseMs,
          });
    const percent = gain === null ? null : gainPercent(gain);
    if (
      share !== undefined &&
      gain !== null &&
      percent !== null &&
      !(best?.percent.gte(percent) ?? false)
    ) {
      best = { share, gain, percent };
    }
  }
  return best === null ? null : { share: best.share, gain: best.gain };
}
