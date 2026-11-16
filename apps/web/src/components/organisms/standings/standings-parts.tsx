import type { LeaderboardBoard } from "@fpr/contracts";
import { leaderboardBoards } from "@fpr/contracts/values";
import type { ComponentProps, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { laneScale } from "../../../lib/lane";
import type { PictureMedal } from "../../atoms/picture/picture";
import * as Segment from "../../atoms/segment/segment";
import { Lane, type LaneProps } from "../../molecules/lane/lane";
import { useRankSlide } from "./rank-slide";

/** The standings shown: by gain over the period, or by balance. */
export type StandingsBoard = LeaderboardBoard;

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

/** The rings of the first three lanes, in order. */
const MEDALS = [
  "gold",
  "silver",
  "bronze",
] as const satisfies readonly PictureMedal[];

/** The top row: the `Title`, then the `BoardSwitch`. */
export function Header({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "flex flex-wrap items-center justify-between gap-s pb-s",
        "ps-s",
        "tablet:ps-[0.75rem]",
        "desktop:ps-[0.75rem]",
        className,
      )}
    />
  );
}

/** “Standings”, with the period after it in words: “Standings · this month”. */
export function Title({
  period,
  className,
  ...props
}: { period?: string | undefined } & Omit<ComponentProps<"h2">, "children">) {
  const { t } = useTranslation();

  return (
    <h2
      {...props}
      className={cn("text-l font-semibold text-primary", className)}
    >
      {period === undefined
        ? t("standings.title")
        : t("standings.titleOver", { period })}
    </h2>
  );
}

/** The Gain / Balance switch. */
export function BoardSwitch({
  board,
  onBoardChange,
}: {
  board: StandingsBoard;
  onBoardChange?: ((board: StandingsBoard) => void) | undefined;
}) {
  const { t } = useTranslation();

  return (
    <Segment.Root<StandingsBoard>
      backdrop="snow"
      value={board}
      onValueChange={(next) => onBoardChange?.(next)}
      aria-label={t("controls.standings.label")}
    >
      {leaderboardBoards.map((option) => (
        <Segment.Item key={option} value={option}>
          {t(`controls.standings.${option}`)}
        </Segment.Item>
      ))}
    </Segment.Root>
  );
}

/** Nobody is in the race yet. */
export function Empty() {
  const { t } = useTranslation();

  return (
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
  );
}

/** The lanes, highest first, on one scale, sliding to their new rank when the order changes. */
export function Lanes({
  members,
  viewerId,
  focused,
  onFocus,
  panel,
}: {
  members: readonly StandingsMember[];
  viewerId: string | null;
  focused: string | null;
  onFocus: (id: string | null) => void;
  panel: ((member: StandingsMember) => ReactNode) | undefined;
}) {
  const list = useRankSlide(members.map((member) => member.id).join(" "));

  const scale = laneScale(members.map((member) => member.value));

  return (
    <ol ref={list} className="flex flex-col gap-[0.125rem]">
      {members.map(({ id, ...member }, index) => (
        // The card's surface, so lanes crossing as they slide read as rows over each other.
        <li key={id} data-member={id} className="rounded-m bg-surface">
          <Lane
            {...member}
            you={id === viewerId}
            medal={MEDALS[index] ?? null}
            scale={scale}
            open={id === focused}
            onOpenChange={(open) => onFocus(open ? id : null)}
          >
            {panel?.({ id, ...member })}
          </Lane>
        </li>
      ))}
    </ol>
  );
}
