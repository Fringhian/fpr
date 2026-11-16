import type { Leaderboard, LeaderboardQuery, Unit } from "@fpr/contracts";
import { mock } from "../server/implementer.ts";
import { money } from "../store/decimal.ts";
import { toGain } from "../store/gain.ts";
import { toPerson } from "../store/people.ts";
import {
  bestHolding,
  compareGains,
  membersView,
  raceField,
  raceView,
  shareLeaderboardView,
  standing,
} from "../store/race.ts";
import { measuredFrom } from "../store/series.ts";
import type { MockStore } from "../store/types.ts";

/**
 * The standings as of the last close, highest first. An anonymous viewer's
 * gain board ranks in percent whatever the request asks.
 */
function leaderboard(
  store: MockStore,
  { board, period }: Required<Pick<LeaderboardQuery, "board" | "period">>,
  unit: Unit,
): Leaderboard {
  const { window, started, notStarted } = raceField(store, period);
  const rows = started.map((person) => ({
    person,
    ...standing(store, person, window),
  }));
  const lastCloseOn = store.calendar.lastCloseOn;
  if (board === "balance") {
    rows.sort((a, b) => b.valuation.balanceEur.cmp(a.valuation.balanceEur));
    return {
      board,
      lastCloseOn,
      rows: rows.map((row) => ({
        member: toPerson(row.person),
        balanceEur: money(row.valuation.balanceEur),
        incomplete: row.valuation.incomplete,
        bestHolding: bestHolding(row.shareGains),
      })),
      notStarted,
    };
  }
  const compare = compareGains(unit);
  rows.sort((a, b) => compare(a.gain, b.gain));
  return {
    board,
    unit,
    lastCloseOn,
    rows: rows.map((row) => ({
      member: toPerson(row.person),
      gain: toGain(row.gain),
      measuredFrom: measuredFrom(store, row.person.id, window),
      incomplete: row.valuation.incomplete,
      bestHolding: bestHolding(row.shareGains),
    })),
    notStarted,
  };
}

/** Leaderboards, members, and the race chart. */
export const raceRoutes = {
  leaderboard: mock.race.leaderboard.handler(({ context, input }) =>
    leaderboard(
      context.store,
      input,
      context.viewer?.role === "anonymous" ? "percent" : input.unit,
    ),
  ),
  shareLeaderboard: mock.race.shareLeaderboard.handler(({ context, input }) =>
    shareLeaderboardView(context.store, input.period),
  ),
  members: mock.race.members.handler(({ context, input }) =>
    membersView(context.store, input.period),
  ),
  race: mock.race.race.handler(({ context, input }) =>
    raceView(context.store, input.period),
  ),
};
