import type {
  Leaderboard,
  LeaderboardBoard,
  Period,
  Unit,
} from "@fpr/contracts";
import { useQuery } from "@tanstack/react-query";
import { liveView as homeRead } from "../../../lib/api/query-client";
import { useApi } from "../../../lib/api/use-api";

/** The standings by gain, which the sentence and the focus panel read. */
export type GainStandings = Extract<Leaderboard, { board: "gain" }>;

/**
 * Home's reads for the view: the race chart; the gain standings, which the
 * sentence and the focus panel read; the standings the switch shows, the same
 * read when it is on gain; and the shares ranked by their change, for the
 * star share.
 */
export function useHomeData({
  period,
  unit,
  board,
}: {
  period: Period;
  unit: Unit;
  board: LeaderboardBoard;
}) {
  const api = useApi();
  const race = useQuery(
    api.race.race.queryOptions({ input: { period }, ...homeRead }),
  );
  const gains = useQuery(
    api.race.leaderboard.queryOptions({
      input: { board: "gain", period, unit },
      ...homeRead,
    }),
  );
  const standings = useQuery(
    api.race.leaderboard.queryOptions({
      input: { board, period, unit },
      ...homeRead,
    }),
  );
  const shares = useQuery(
    api.race.shareLeaderboard.queryOptions({ input: { period }, ...homeRead }),
  );

  // The star share is a garnish: the page shows without it.
  const needed = [race, gains, standings];

  return {
    race: race.data,
    gains: gains.data?.board === "gain" ? gains.data : undefined,
    standings: standings.data,
    starShare: shares.data?.rows[0],
    failed: needed.some((read) => read.isError && read.data === undefined),
    retry: () => {
      for (const read of needed) void read.refetch();
    },
  };
}
