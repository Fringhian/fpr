import type { Period } from "@fpr/contracts";
import {
  type BalancePoint,
  type ChangeAtDayValue,
  type Share,
  shareLists,
  shareValues,
  type User,
} from "@fpr/db";
import type { ApiServices } from "../orpc.js";
import {
  type Big,
  type GainAmount,
  gainPercent,
} from "../valuation/decimal.js";
import { groupChanges, periodGain } from "../valuation/holding-gains.js";
import {
  balanceGain,
  type RaceWindow,
  raceMembers,
  raceWindow,
  windowPoints,
} from "../valuation/race-window.js";

type ReadServices = Pick<ApiServices, "db" | "series" | "raceTimeZone">;

/** A member's result as of the last close. */
export interface Standing {
  member: User;
  /** Their closes from the period's start to the last close. */
  closes: BalancePoint[];
  end: BalancePoint;
  gain: GainAmount;
}

/** The race as of the last close: who has a close, and who hasn't started. */
export interface Standings {
  window: RaceWindow;
  standings: Standing[];
  notStarted: User[];
}

/**
 * Every member's balance and gain at the last close, measured from their
 * first close in the period. A member with no close yet hasn't started.
 */
export async function standingsAt(
  context: ReadServices,
  period: Period,
): Promise<Standings> {
  const [window, members] = await Promise.all([
    raceWindow(context, period),
    raceMembers(context.db),
  ]);
  const standings: Standing[] = [];
  const notStarted: User[] = [];
  for (const member of members) {
    const closes = windowPoints(window, member.id, { closesOnly: true });
    const [start] = closes;
    const end = closes.at(-1);
    if (start === undefined || end === undefined) {
      notStarted.push(member);
    } else {
      standings.push({ member, closes, end, gain: balanceGain(start, end) });
    }
  }
  return { window, standings, notStarted };
}

/** A member's holding with the largest gain over the period, in percent. */
export interface BestHolding {
  share: Share;
  gain: GainAmount;
}

function bestOf(
  changes: readonly ChangeAtDayValue[],
  prices: { starts: Map<string, string>; ends: Map<string, string> },
  window: RaceWindow,
): { shareId: string; gain: GainAmount; percent: Big } | undefined {
  let best: { shareId: string; gain: GainAmount; percent: Big } | undefined;
  for (const [shareId, held] of groupChanges(changes, (c) => c.shareId)) {
    const gain = periodGain({
      changes: held,
      from: window.startAt,
      to: window.series.lastCloseAt,
      startPrice: prices.starts.get(shareId) ?? null,
      endPrice: prices.ends.get(shareId) ?? null,
    });
    const percent = gain === null ? null : gainPercent(gain);
    if (
      gain !== null &&
      percent !== null &&
      !(best?.percent.gte(percent) ?? false)
    ) {
      best = { shareId, gain, percent };
    }
  }
  return best;
}

/**
 * Each member's holding with the largest gain in percent from the period's
 * start to the last close, among the shares they held over it, by user id.
 */
export async function bestHoldings(
  context: ReadServices,
  window: RaceWindow,
): Promise<Map<string, BestHolding>> {
  const { db } = context;
  const changes = await shareValues.changesAtDayValue(
    db,
    {},
    context.raceTimeZone,
  );
  const ids = [...new Set(changes.map(({ shareId }) => shareId))];
  const [shares, starts, ends] = await Promise.all([
    shareLists.byIds(db, ids),
    shareValues.valuesAt(db, ids, { at: window.startAt }),
    shareValues.valuesAt(db, ids, { at: window.series.lastCloseAt }),
  ]);
  const prices = {
    starts: new Map([...starts].map(([id, value]) => [id, value.priceEur])),
    ends: new Map([...ends].map(([id, value]) => [id, value.priceEur])),
  };
  const best = new Map<string, BestHolding>();
  for (const [userId, held] of groupChanges(changes, (c) => c.userId)) {
    const top = bestOf(held, prices, window);
    const share = top === undefined ? undefined : shares.get(top.shareId);
    if (top !== undefined && share !== undefined) {
      best.set(userId, { share, gain: top.gain });
    }
  }
  return best;
}
