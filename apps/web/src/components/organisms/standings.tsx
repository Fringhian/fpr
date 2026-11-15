import { type ComponentProps, type ReactNode, useId, useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import { laneScale } from "../../lib/lane";
import type { PictureMedal } from "../atoms/picture";
import * as Segment from "../atoms/segment";
import { Lane, LaneNotStarted, type LaneProps } from "../molecules/lane";

/** The standings shown: by gain over the period, or by balance. */
export type StandingsBoard = "gain" | "balance";

const BOARDS = ["gain", "balance"] as const satisfies readonly StandingsBoard[];

/** The rings of the first three lanes, in order. */
const MEDALS = [
  "gold",
  "silver",
  "bronze",
] as const satisfies readonly PictureMedal[];

/**
 * One member in the race: who they are, and what their lane shows. `value`
 * names the board it was measured on, so pass the rows of the board shown.
 */
export type StandingsMember = Pick<
  LaneProps,
  "name" | "color" | "photo" | "best" | "value" | "measuredFrom" | "incomplete"
> & {
  /** The member's id: what `focusedId`, `viewerId` and `onFocusMember` name. */
  id: string;
};

interface StandingsOwnProps {
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
}

export type StandingsProps = StandingsOwnProps &
  Omit<ComponentProps<"section">, keyof StandingsOwnProps | "children">;

/**
 * Every member's lane in one card, highest first, with the Gain / Balance
 * switch and who hasn't started under the lanes. The lanes share one scale,
 * so their bars compare; the order and the bars show the ranking, with no
 * rank numbers. Pressing a lane focuses its member and opens it in place.
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
  const { t } = useTranslation();
  const titleId = useId();
  const [heldFocus, setHeldFocus] = useState<string | null>(null);

  const empty = members.length === 0;
  const switchable = !anonymous && !empty;
  const focused = focusedId === undefined ? heldFocus : focusedId;
  const scale = laneScale(members.map((member) => member.value));
  const focus = (id: string | null) => {
    setHeldFocus(id);
    onFocusMember?.(id);
  };

  return (
    <section
      {...props}
      aria-labelledby={titleId}
      className={cn(
        "flex min-w-0 flex-col rounded-l bg-surface shadow-outline",
        "p-s",
        "tablet:p-m",
        "desktop:p-m",
        className,
      )}
    >
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-s pb-s",
          "ps-s",
          "tablet:ps-[0.75rem]",
          "desktop:ps-[0.75rem]",
        )}
      >
        <h2 id={titleId} className="text-l font-semibold text-primary">
          {period === undefined
            ? t("standings.title")
            : t("standings.titleOver", { period })}
        </h2>
        {switchable ? (
          <Segment.Root<StandingsBoard>
            backdrop="snow"
            value={board}
            onValueChange={(next) => onBoardChange?.(next)}
            aria-label={t("controls.standings.label")}
          >
            {BOARDS.map((option) => (
              <Segment.Item key={option} value={option}>
                {t(`controls.standings.${option}`)}
              </Segment.Item>
            ))}
          </Segment.Root>
        ) : null}
      </div>
      {empty ? (
        <div
          className={cn(
            "flex flex-col gap-xs py-m",
            "px-s",
            "tablet:px-[0.75rem]",
            "desktop:px-[0.75rem]",
          )}
        >
          <p className="text-m font-semibold text-primary">
            {t("standings.empty.title")}
          </p>
          <p className="text-s text-secondary">{t("standings.empty.body")}</p>
        </div>
      ) : (
        <ol className="flex flex-col gap-[0.125rem]">
          {members.map(({ id, ...member }, index) => (
            <li key={id}>
              <Lane
                {...member}
                you={id === viewerId}
                medal={MEDALS[index] ?? null}
                scale={scale}
                open={id === focused}
                onOpenChange={(open) => focus(open ? id : null)}
              >
                {panel?.({ id, ...member })}
              </Lane>
            </li>
          ))}
        </ol>
      )}
      <LaneNotStarted names={notStarted} />
    </section>
  );
}
