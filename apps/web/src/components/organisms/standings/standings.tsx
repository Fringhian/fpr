import { type ComponentProps, type ReactNode, useId, useState } from "react";
import { cn } from "../../../lib/cn";
import { Card } from "../../atoms/card/card";
import * as Lane from "../../molecules/lane/lane";
import {
  type StandingsBoard,
  StandingsEmpty,
  StandingsHeader,
  StandingsLanes,
  type StandingsMember,
} from "./standings-parts";

export type { StandingsBoard, StandingsMember } from "./standings-parts";

export type StandingsProps = {
  /** The standings shown, chosen with the Gain / Balance switch. */
  board: StandingsBoard;
  /** Called with the board the viewer picks. The owner loads its rows and passes them as `members`. */
  onBoardChange?: (board: StandingsBoard) => void;
  /** The viewer is anonymous: the standings are by gain only, with no switch. */
  anonymous?: boolean;
  /** The period the gains and best shares are over, in words, after the title: “Standings · this month”. */
  period?: string;
  /** Every member in the race, highest first. The first three get a medal; with none, the standings say nobody is in the race yet, with no switch. */
  members: readonly StandingsMember[];
  /** The names of the members with no entry yet, listed under the lanes. */
  notStarted?: readonly string[];
  /** The viewer's id: their lane is tinted, with “· you” after the name. A guest or an anonymous viewer has no lane. */
  viewerId?: string | null;
  /** The focused member's id, or `null` for none: their lane is open. Leave it out for the standings to hold the focus themselves. */
  focusedId?: string | null;
  /** Called when a lane is pressed: with its member's id, or `null` when the focused lane is pressed again. */
  onFocusMember?: (id: string | null) => void;
  /** What a focused member's opened lane shows under its row, after the best share on phone, such as a link to their page. */
  panel?: (member: StandingsMember) => ReactNode;
} & Omit<
  ComponentProps<"section">,
  | "board"
  | "onBoardChange"
  | "anonymous"
  | "period"
  | "members"
  | "notStarted"
  | "viewerId"
  | "focusedId"
  | "onFocusMember"
  | "panel"
  | "children"
>;

/**
 * Every member's lane in one card, highest first, with the Gain / Balance
 * switch and who hasn't started under the lanes. The lanes share one scale,
 * so their bars compare; the order and the bars show the ranking, with no
 * rank numbers. Pressing a lane focuses its member and opens it in place.
 * When the order changes, each lane slides to its new rank and its bar eases
 * to its new length; with reduced motion, they move at once.
 */
export function Standings({
  board,
  onBoardChange,
  anonymous = false,
  period,
  members,
  notStarted = [],
  viewerId = null,
  focusedId,
  onFocusMember,
  panel,
  className,
  ...props
}: StandingsProps) {
  const titleId = useId();
  const [heldFocus, setHeldFocus] = useState<string | null>(null);

  const empty = members.length === 0;
  const focus = (id: string | null) => {
    setHeldFocus(id);
    onFocusMember?.(id);
  };

  return (
    <Card
      {...props}
      render={<section />}
      aria-labelledby={titleId}
      className={cn(
        "flex min-w-0 flex-col",
        "p-s",
        "tablet:p-m",
        "desktop:p-m",
        className,
      )}
    >
      <StandingsHeader
        titleId={titleId}
        period={period}
        board={board}
        onBoardChange={onBoardChange}
        switchable={!anonymous && !empty}
      />
      {empty ? (
        <StandingsEmpty />
      ) : (
        <StandingsLanes
          members={members}
          viewerId={viewerId}
          focused={focusedId === undefined ? heldFocus : focusedId}
          onFocus={focus}
          panel={panel}
        />
      )}
      <Lane.NotStarted names={notStarted} />
    </Card>
  );
}
