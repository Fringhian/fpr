import {
  type ComponentProps,
  type ReactNode,
  type RefCallback,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { laneScale } from "../../../lib/lane";
import { Card } from "../../atoms/card/card";
import type { PictureMedal } from "../../atoms/picture/picture";
import * as Segment from "../../atoms/segment/segment";
import {
  Lane,
  LaneNotStarted,
  type LaneProps,
} from "../../molecules/lane/lane";

/** The standings shown: by gain over the period, or by balance. */
export type StandingsBoard = "gain" | "balance";

const BOARDS = ["gain", "balance"] as const satisfies readonly StandingsBoard[];

/** The rings of the first three lanes, in order. */
const MEDALS = [
  "gold",
  "silver",
  "bronze",
] as const satisfies readonly PictureMedal[];

/** How a lane slides to its new rank: short and soft. */
const SLIDE: KeyframeAnimationOptions = {
  duration: 300,
  easing: "cubic-bezier(0.25, 1, 0.5, 1)",
};

/** Where each lane of the list sits, by member id, measured from the list's top. */
function laneTops(list: HTMLOListElement): Map<string, number> {
  const tops = new Map<string, number>();
  for (const item of list.children) {
    if (item instanceof HTMLElement && item.dataset.member !== undefined) {
      tops.set(item.dataset.member, item.offsetTop);
    }
  }
  return tops;
}

/**
 * Slides each lane from its old place to its new one when the order of
 * `members` changes, the columns never moving: only the lanes' vertical
 * position animates, and not at all under reduced motion. Returns the ref for
 * the list, whose items carry `data-member`.
 */
function useRankSlide(
  members: readonly StandingsMember[],
): RefCallback<HTMLOListElement> {
  const list = useRef<HTMLOListElement | null>(null);
  const tops = useRef(new Map<string, number>());
  const shownOrder = useRef("");

  const order = members.map((member) => member.id).join(" ");

  // Every commit: compare with where the lanes were, then remember where they are.
  useLayoutEffect(() => {
    const element = list.current;
    if (element === null) {
      return;
    }
    const before = tops.current;
    const after = laneTops(element);
    tops.current = after;
    const reordered = shownOrder.current !== "" && shownOrder.current !== order;
    shownOrder.current = order;
    if (
      !reordered ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    for (const item of element.children) {
      if (!(item instanceof HTMLElement)) {
        continue;
      }
      const id = item.dataset.member;
      const from = id === undefined ? undefined : before.get(id);
      const to = id === undefined ? undefined : after.get(id);
      if (from === undefined || to === undefined || from === to) {
        continue;
      }
      for (const running of item.getAnimations()) {
        running.cancel();
      }
      item.animate(
        [{ transform: `translateY(${from - to}px)` }, { transform: "none" }],
        SLIDE,
      );
    }
  });

  // A lane opening or shutting, or the page resizing, moves the lanes with no
  // new order: measure again once the list resizes or a panel's height settles.
  return useCallback((element: HTMLOListElement | null) => {
    if (element === null) {
      return;
    }
    list.current = element;
    const measure = () => {
      tops.current = laneTops(element);
    };
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.addEventListener("transitionend", measure);
    return () => {
      observer.disconnect();
      element.removeEventListener("transitionend", measure);
      list.current = null;
      tops.current = new Map();
      shownOrder.current = "";
    };
  }, []);
}

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
  const { t } = useTranslation();
  const titleId = useId();
  const [heldFocus, setHeldFocus] = useState<string | null>(null);
  const list = useRankSlide(members);

  const empty = members.length === 0;
  const switchable = !anonymous && !empty;
  const focused = focusedId === undefined ? heldFocus : focusedId;
  const scale = laneScale(members.map((member) => member.value));
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
                onOpenChange={(open) => focus(open ? id : null)}
              >
                {panel?.({ id, ...member })}
              </Lane>
            </li>
          ))}
        </ol>
      )}
      <LaneNotStarted names={notStarted} />
    </Card>
  );
}
