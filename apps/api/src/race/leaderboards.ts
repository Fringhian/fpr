import {
  type Leaderboard,
  type LeaderboardBoard,
  type Period,
  Role,
  type ShareLeaderboard,
  type Unit,
} from "@fpr/contracts";
import { shareLists, shareValues } from "@fpr/db";
import { toPerson } from "../me/me.js";
import type { ApiServices } from "../orpc.js";
import type { Viewer } from "../pipeline/index.js";
import { changeStarts, priceChange } from "../shares/quotes.js";
import { toShareSummary } from "../shares/share-summary.js";
import {
  Big,
  type GainAmount,
  gainPercent,
  money,
  toGain,
} from "../valuation/decimal.js";
import { measuredFrom, raceWindow } from "../valuation/race-window.js";
import {
  type BestHolding,
  bestHoldings,
  type Standing,
  standingsAt,
} from "./standings.js";

type ReadServices = Pick<ApiServices, "db" | "series" | "raceTimeZone">;

/** Highest first, a percentage of `null` last. */
function byGain(unit: Unit) {
  return (a: GainAmount, b: GainAmount): number => {
    if (unit === "eur") {
      return b.eur.cmp(a.eur);
    }
    const [pa, pb] = [gainPercent(a), gainPercent(b)];
    return pa === null || pb === null
      ? Number(pa === null) - Number(pb === null)
      : pb.cmp(pa);
  };
}

function toBest(best: BestHolding | undefined) {
  return best === undefined
    ? null
    : { share: toShareSummary(best.share), gain: toGain(best.gain) };
}

/**
 * `GET /leaderboards/{board}?period=&unit=`: the standings as of the last
 * close, by balance or by gain. Members tied keep the order they were added
 * in. An anonymous viewer is ranked in percent, as they see no euros.
 */
export async function readLeaderboard(
  context: ReadServices,
  viewer: Viewer,
  input: { board: LeaderboardBoard; period: Period; unit: Unit },
): Promise<Leaderboard> {
  const { window, standings, notStarted } = await standingsAt(
    context,
    input.period,
  );
  const best = await bestHoldings(context, window);
  const common = (standing: Standing) => ({
    member: toPerson(standing.member),
    incomplete: standing.end.incomplete,
    bestHolding: toBest(best.get(standing.member.id)),
  });
  const ordered = standings.toSorted((a, b) =>
    a.member.id.localeCompare(b.member.id),
  );
  const base = {
    lastCloseOn: window.lastCloseOn,
    notStarted: notStarted.map(toPerson),
  };
  if (input.board === "balance") {
    const balance = (s: Standing) => new Big(s.end.balanceEur);
    return {
      ...base,
      board: "balance",
      rows: ordered
        .sort((a, b) => balance(b).cmp(balance(a)))
        .map((s) => ({ ...common(s), balanceEur: money(balance(s)) })),
    };
  }
  const unit = viewer.role === Role.anonymous ? "percent" : input.unit;
  return {
    ...base,
    board: "gain",
    unit,
    rows: ordered
      .sort((a, b) => byGain(unit)(a.gain, b.gain))
      .map((s) => ({
        ...common(s),
        gain: toGain(s.gain),
        measuredFrom: measuredFrom(window, s.member.id),
      })),
  };
}

/**
 * `GET /leaderboards/shares?period=`: the shares someone held at the last
 * close, by their change in percent from the period's start to it, or for
 * `all` from their first price. A share without a price at both ends is left
 * out.
 */
export async function readShareLeaderboard(
  context: ReadServices,
  input: { period: Period },
): Promise<ShareLeaderboard> {
  const { db } = context;
  const window = await raceWindow(context, input.period);
  const lastClose = window.series.lastCloseAt;
  const ids = await shareValues.heldAt(db, lastClose);
  const [shares, starts, ends] = await Promise.all([
    shareLists.byIds(db, ids),
    changeStarts(db, ids, { period: input.period, window }),
    shareValues.valuesAt(db, ids, { at: lastClose, fallback: false }),
  ]);
  const rows = [...shares.values()].flatMap((share) => {
    const change = priceChange(starts.get(share.id), ends.get(share.id));
    return change === null ? [] : [{ share: toShareSummary(share), change }];
  });
  const percent = (row: (typeof rows)[number]) => new Big(row.change.percent);
  return {
    lastCloseOn: window.lastCloseOn,
    rows: rows.sort(
      (a, b) =>
        percent(b).cmp(percent(a)) || a.share.name.localeCompare(b.share.name),
    ),
  };
}
