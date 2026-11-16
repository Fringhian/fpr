import type { Leaderboard, LeaderboardQuery, Unit } from "@fpr/contracts";
import { mock } from "../server/implementer.ts";
import { money } from "../store/decimal.ts";
import { toGain } from "../store/gain.ts";
import { toPerson } from "../store/people.ts";
import {
  compareGains,
  membersView,
  raceView,
  shareLeaderboardView,
  toBestHolding,
} from "../store/race.ts";
import { measuredFrom } from "../store/series.ts";
import { bestHolding, type Standing, standingsAt } from "../store/standings.ts";
import type { MockStore } from "../store/types.ts";

/**
 * The standings as of the last close, highest first. Members tied keep the
 * order they were added in. An anonymous viewer's gain board ranks in percent
 * whatever the request asks.
 */
function leaderboard(
  store: MockStore,
  { board, period }: Required<Pick<LeaderboardQuery, "board" | "period">>,
  unit: Unit,
): Leaderboard {
  const { window, standings, notStarted } = standingsAt(store, period);
  const common = ({ person, end }: Standing) => ({
    member: toPerson(person),
    incomplete: end.incomplete,
    bestHolding: toBestHolding(bestHolding(store, person.id, window)),
  });
  const base = {
    lastCloseOn: store.calendar.lastCloseOn,
    notStarted: notStarted.map(toPerson),
  };
  if (board === "balance") {
    return {
      ...base,
      board,
      rows: standings
        .toSorted((a, b) => b.end.balanceEur.cmp(a.end.balanceEur))
        .map((row) => ({
          ...common(row),
          balanceEur: money(row.end.balanceEur),
        })),
    };
  }
  const compare = compareGains(unit);
  return {
    ...base,
    board,
    unit,
    rows: standings
      .toSorted((a, b) => compare(a.gain, b.gain))
      .map((row) => ({
        ...common(row),
        gain: toGain(row.gain),
        measuredFrom: measuredFrom(store, row.person.id, window),
      })),
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
