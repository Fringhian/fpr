import type { Id, Leaderboard, LeaderboardBoard } from "@fpr/contracts";
import { useId } from "react";
import { useTranslation } from "react-i18next";
import { LoadingPlaceholder } from "../../../components/atoms/loading-placeholder/loading-placeholder";
import * as Standings from "../../../components/organisms/standings/standings";
import { lookOf } from "../../../lib/look";

/** A row's lane but its value: who, their best share, and whether a price is missing. */
function laneOf({
  member,
  bestHolding,
  incomplete,
}: Leaderboard["rows"][number]): Omit<Standings.StandingsMember, "value"> {
  return {
    id: member.id,
    ...lookOf(member),
    best: bestHolding && {
      share: bestHolding.share.name,
      percent: bestHolding.gain.percent,
    },
    incomplete,
  };
}

/** Each row of the standings as its lane shows it: the gain in the unit it ranks by, or the balance. */
function lanesOf(standings: Leaderboard): Standings.StandingsMember[] {
  return standings.board === "gain"
    ? standings.rows.map((row) => ({
        ...laneOf(row),
        value: { board: "gain", gain: row.gain, unit: standings.unit },
        measuredFrom: row.measuredFrom,
      }))
    : standings.rows.map((row) => ({
        ...laneOf(row),
        value: { board: "balance", balance: row.balanceEur ?? null },
      }));
}

/** The standings' card while they load: the title, and a placeholder for the lanes. */
function Loading({ period }: { period: string }) {
  const { t } = useTranslation();
  const titleId = useId();

  return (
    <Standings.Root aria-labelledby={titleId}>
      <Standings.Header>
        <Standings.Title id={titleId} period={period} />
      </Standings.Header>
      <LoadingPlaceholder className="h-[15rem]">
        {t("standings.loading")}
      </LoadingPlaceholder>
    </Standings.Root>
  );
}

/**
 * Home's standings, by gain or by balance, with who hasn't started under the
 * lanes. The switch shows the board the lanes are from: after a press, the
 * last board stays, busy, until the new one loads, and its lanes slide to
 * their new ranks. Pressing a lane focuses its member and opens it, on phone
 * with their best share.
 */
export function HomeStandings({
  standings,
  board,
  onBoardChange,
  anonymous,
  period,
  viewerId,
  keptId,
  onFocusMember,
}: {
  standings: Leaderboard | undefined;
  /** The board asked for, which `standings` may not be from yet. */
  board: LeaderboardBoard;
  onBoardChange: (board: LeaderboardBoard) => void;
  anonymous: boolean;
  /** The period in words: “this month”. */
  period: string;
  viewerId: Id | null;
  keptId: Id | null;
  onFocusMember: (id: Id | null) => void;
}) {
  return standings === undefined ? (
    <Loading period={period} />
  ) : (
    <Standings.Basic
      board={standings.board}
      aria-busy={standings.board !== board || undefined}
      onBoardChange={onBoardChange}
      anonymous={anonymous}
      period={period}
      members={lanesOf(standings)}
      notStarted={standings.notStarted.map((person) => person.displayName)}
      viewerId={viewerId}
      focusedId={keptId}
      onFocusMember={onFocusMember}
    />
  );
}
