import type { IsoDate } from "@fpr/contracts";
import { type ComponentProps, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import type { GainUnit } from "../../../lib/gain";
import { Card } from "../../atoms/card/card";
import { Chart } from "../../molecules/chart/chart";
import type { ChartValueFormat } from "../../molecules/chart/chart-model";
import { LineEnds } from "./race-card-ends";
import { Legend } from "./race-card-legend";
import { type RaceCast, type RaceMember, raceLines } from "./race-card-model";

export type { RaceMember } from "./race-card-model";

/**
 * The card the race rests in: the one card of Home on the horizon, with the
 * resting shadow. It holds the `Header` and the `Race`.
 */
export function Root({ className, ...props }: ComponentProps<"section">) {
  return (
    <Card
      {...props}
      elevation="rest"
      render={<section />}
      className={cn(
        "grid min-w-0 gap-s font-sans text-primary",
        "p-m",
        "tablet:p-l",
        "desktop:p-l",
        className,
      )}
    />
  );
}

/**
 * The card's top row: “The race”, then its children on the right, such as
 * the market status.
 */
export function Header({
  className,
  children,
  ...props
}: ComponentProps<"div">) {
  const { t } = useTranslation();

  return (
    <div
      {...props}
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-m gap-y-xs",
        className,
      )}
    >
      <h2 className="text-m font-semibold">{t("raceCard.title")}</h2>
      {children}
    </div>
  );
}

/** The race's values, on the chart's axis and on the signs alike: signed gains, in whole euros or in percent. */
function raceFormat(unit: GainUnit): ChartValueFormat {
  return {
    unit: unit === "eur" ? "money" : "percent",
    precision: "euros",
    signed: true,
  };
}

/** You and the focused member, once each, in that order, among the members in the race. */
function castMembers(
  byId: ReadonlyMap<string, RaceMember>,
  { youId, focusId }: RaceCast,
): RaceMember[] {
  return [...new Set([youId, focusId])].flatMap((id) => {
    const member = id == null ? undefined : byId.get(id);
    return member ? [member] : [];
  });
}

/** Whether any line has a point after the last close: today's, not final. */
function hasToday(
  members: readonly RaceMember[],
  lastClose: IsoDate | undefined,
): boolean {
  return (
    lastClose !== undefined &&
    members.some((member) => member.points.some((p) => p.day > lastClose))
  );
}

/** Room on the right, from tablet up, for the signs and pictures at the lines' ends. */
const PLOT = cn("min-w-0", "pr-0", "tablet:pr-[10rem]", "desktop:pr-[10rem]");
const CHART = cn("", "h-[13rem]", "tablet:h-[16rem]", "desktop:h-[16rem]");

export type RaceProps = {
  /** Every member in the race, each with their gain at each day of the period. Pass a stable array: a new one redraws every line. */
  members: readonly RaceMember[];
  /** The viewer's id, when they are in the race: their line is in colour, and their sign reads “You”. A guest or an anonymous viewer has none. */
  youId?: string | null | undefined;
  /** The focused member's id: their line is in colour, on top, with their sign. Without it, only your line is in colour. */
  focusId?: string | null | undefined;
  /** The last close: the points after it are today's, dashed, and the card says “Today, not final”. */
  lastClose?: IsoDate | undefined;
  /** The unit setting: `eur` draws gains in whole euros, `percent` in percent. An anonymous viewer has percent only. */
  unit: GainUnit;
  /** Called with a member's id when their curve, picture or sign is selected. Without it, nothing is selectable. */
  onFocusMember?: ((id: string) => void) | undefined;
} & ComponentProps<"div">;

/**
 * Every member's gain over the period on one chart. Only you and the focused
 * member are in colour, each named by a trail sign with their latest value;
 * everyone else is a thin grey line, named on tablet and desktop by the
 * picture at its end. On phone the lines end bare and the two signs sit under
 * the chart. Selecting a curve, a picture or a sign focuses its member.
 */
export function Race({
  members,
  youId,
  focusId,
  lastClose,
  unit,
  onFocusMember,
  className,
  ...props
}: RaceProps) {
  const { t } = useTranslation();
  const youLabel = t("raceCard.you");
  const lines = useMemo(
    () => raceLines(members, { youId, focusId, lastClose, youLabel }),
    [members, youId, focusId, lastClose, youLabel],
  );
  const byId = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members],
  );

  const cast = { youId, focusId };
  const format = raceFormat(unit);
  const ends = { members: byId, format, onFocusMember, ...cast };

  return (
    <div {...props} className={cn("grid min-w-0 gap-s", className)}>
      <div className={PLOT}>
        <Chart
          lines={lines}
          label={t("raceCard.label")}
          {...format}
          className={CHART}
          onSelectLine={onFocusMember}
          overlay={(layout) => <LineEnds layout={layout} {...ends} />}
        />
      </div>
      <Legend
        signs={castMembers(byId, cast)}
        today={hasToday(members, lastClose)}
        format={format}
        onFocusMember={onFocusMember}
        {...cast}
      />
    </div>
  );
}
