import { type ComponentProps, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import type { IsoDate } from "../../../lib/format";
import type { GainUnit } from "../../../lib/gain";
import { useLanguage } from "../../../lib/i18n";
import type { MemberColor } from "../../../lib/member-color";
import { Picture } from "../../atoms/picture/picture";
import { TrailSign } from "../../atoms/trail-sign/trail-sign";
import { Chart, type ChartLayout } from "../../molecules/chart/chart";
import {
  type ChartValueFormat,
  formatChartValue,
  lastPoint,
} from "../../molecules/chart/chart-model";
import {
  type RaceCast,
  type RaceMember,
  type RaceRole,
  raceLines,
  roleOf,
  spreadMarks,
} from "./race-card-model";

export type { RaceMember } from "./race-card-model";

/** The dot at the end of a line in colour. */
const DOTS = {
  vermilion: "bg-vermilion",
  cobalt: "bg-cobalt",
  green: "bg-green",
  violet: "bg-violet",
  amber: "bg-amber",
  pink: "bg-pink",
  cyan: "bg-cyan",
  lime: "bg-lime",
  sienna: "bg-sienna",
  periwinkle: "bg-periwinkle",
} as const satisfies Record<MemberColor, string>;

/** From a line's end to the left edge of its mark, in pixels. */
const MARK_OFFSET = 12;

/** The marks' heights in pixels, a sign's and a picture's, and the room between two. */
const SIGN_HEIGHT = 26;
const PICTURE_HEIGHT = 20;
const MARK_GAP = 2;

/** Shown on tablet and desktop only. */
const wide = cn("", "hidden", "tablet:block", "desktop:block");

/** The race's values, on the chart's axis and on the signs alike: signed gains, in whole euros or in percent. */
function raceFormat(unit: GainUnit): ChartValueFormat {
  return {
    unit: unit === "eur" ? "money" : "percent",
    precision: "euros",
    signed: true,
  };
}

/**
 * The card the race rests in: the one card of Home on the horizon, with the
 * resting shadow. It holds the `Header` and the `Race`.
 */
export function Root({ className, ...props }: ComponentProps<"section">) {
  return (
    <section
      {...props}
      className={cn(
        "grid min-w-0 gap-s rounded-l bg-surface font-sans text-primary shadow-rest",
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

interface SignProps {
  member: RaceMember;
  role: RaceRole;
  format: ChartValueFormat;
  current: boolean;
  onFocusMember: ((id: string) => void) | undefined;
  className?: string;
}

/** A trail sign naming you or the focused member, with their latest value: a button that focuses them. */
function Sign({
  member,
  role,
  format,
  current,
  onFocusMember,
  className,
}: SignProps) {
  const { t } = useTranslation();
  const language = useLanguage();

  const name = role === "you" ? t("raceCard.you") : member.name;
  const last = lastPoint(member);
  const value =
    last === undefined ? null : formatChartValue(last.value, language, format);
  const sign = (
    <TrailSign
      person={member}
      className={cn("", "", "", "", "group-hover:bg-highlight")}
    >
      <span className="max-w-[5rem] truncate">{name}</span>
      {value === null ? null : <span className="tabular-nums">{value}</span>}
    </TrailSign>
  );

  return onFocusMember ? (
    <button
      type="button"
      aria-current={current || undefined}
      onClick={() => onFocusMember(member.id)}
      className={cn(
        "group cursor-pointer rounded-full",
        "",
        "",
        "",
        "focus-visible:focus-ring",
        className,
      )}
    >
      {sign}
    </button>
  ) : (
    <span className={className}>{sign}</span>
  );
}

interface EndPictureProps {
  member: RaceMember;
  current: boolean;
  onFocusMember: ((id: string) => void) | undefined;
  className?: string;
}

/** The picture at the end of a grey line, which names it: a button that focuses its member. */
function EndPicture({
  member,
  current,
  onFocusMember,
  className,
}: EndPictureProps) {
  const { t } = useTranslation();

  const picture = (
    <Picture
      aria-hidden={onFocusMember ? true : undefined}
      name={member.name}
      color={member.color}
      photo={member.photo ?? null}
      size="xs"
    />
  );

  return onFocusMember ? (
    <button
      type="button"
      aria-label={t("raceCard.focusOn", { name: member.name })}
      aria-current={current || undefined}
      onClick={() => onFocusMember(member.id)}
      className={cn(
        "flex cursor-pointer rounded-full shadow-[0_0_0_1.5px_transparent]",
        "",
        "",
        "",
        "hover:shadow-[0_0_0_1.5px_var(--color-primary)]",
        "focus-visible:focus-ring",
        className,
      )}
    >
      {picture}
    </button>
  ) : (
    <span className={cn("flex", className)}>{picture}</span>
  );
}

interface LineEndsProps extends RaceCast {
  layout: ChartLayout;
  members: ReadonlyMap<string, RaceMember>;
  format: ChartValueFormat;
  onFocusMember: ((id: string) => void) | undefined;
}

/**
 * What the lines end with: a dot on the two lines in colour, and from tablet
 * up, the focused member's and your signs, and every other member's picture,
 * nudged apart where they would overlap and tied to their line.
 */
function LineEnds({
  layout,
  members,
  format,
  onFocusMember,
  youId,
  focusId,
}: LineEndsProps) {
  const ends = layout.ends.flatMap((end) => {
    const member = members.get(end.id);
    if (member === undefined) return [];
    const role = roleOf(member.id, { youId, focusId });
    const size = role === "context" ? PICTURE_HEIGHT : SIGN_HEIGHT;
    return [{ ...end, member, role, size }];
  });
  const centres = spreadMarks(ends, {
    gap: MARK_GAP,
    top: 0,
    bottom: layout.height,
  });
  const marks = ends
    .map((end) => ({ ...end, centre: centres.get(end.id) ?? end.y }))
    .toSorted((a, b) => a.centre - b.centre);
  const current = focusId ?? youId;

  return (
    <>
      <svg
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 size-full overflow-visible stroke-muted",
          wide,
        )}
      >
        {marks.map((mark) =>
          Math.abs(mark.centre - mark.y) > 1 ? (
            <line
              key={mark.id}
              x1={mark.x}
              y1={mark.y}
              x2={mark.x + MARK_OFFSET}
              y2={mark.centre}
              strokeWidth={1}
            />
          ) : null,
        )}
      </svg>
      {marks.map((mark) =>
        mark.role === "context" ? null : (
          <span
            key={mark.id}
            aria-hidden
            style={{ left: mark.x, top: mark.y }}
            className={cn(
              "pointer-events-none absolute size-[0.625rem] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface",
              DOTS[mark.member.color],
            )}
          />
        ),
      )}
      <div className={cn("pointer-events-none absolute inset-0", wide)}>
        {marks.map((mark) => (
          <div
            key={mark.id}
            style={{ left: mark.x + MARK_OFFSET, top: mark.centre }}
            className="pointer-events-auto absolute flex -translate-y-1/2"
          >
            {mark.role === "context" ? (
              <EndPicture
                member={mark.member}
                current={mark.id === current}
                onFocusMember={onFocusMember}
              />
            ) : (
              <Sign
                member={mark.member}
                role={mark.role}
                format={format}
                current={mark.id === current}
                onFocusMember={onFocusMember}
              />
            )}
          </div>
        ))}
      </div>
    </>
  );
}

/** A short dashed stroke and its words: what the dashed end of the lines means. */
function NotFinalKey() {
  const { t } = useTranslation();

  return (
    <span className="ml-auto inline-flex items-center gap-xs text-xs text-secondary">
      <svg
        aria-hidden
        width="16"
        height="2"
        className="stroke-secondary"
        viewBox="0 0 16 2"
      >
        <line
          x1="0"
          y1="1"
          x2="16"
          y2="1"
          strokeWidth={2}
          strokeDasharray="3 3"
        />
      </svg>
      {t("raceCard.notFinal")}
    </span>
  );
}

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
  const lines = useMemo(
    () =>
      raceLines(members, {
        youId,
        focusId,
        lastClose,
        youLabel: t("raceCard.you"),
      }),
    [members, youId, focusId, lastClose, t],
  );
  const byId = useMemo(
    () => new Map(members.map((member) => [member.id, member])),
    [members],
  );

  const format = raceFormat(unit);
  const current = focusId ?? youId;
  const signs = [...new Set([youId, focusId])].flatMap((id) => {
    const member = id == null ? undefined : byId.get(id);
    return member ? [member] : [];
  });
  const today =
    lastClose !== undefined &&
    members.some((member) =>
      member.points.some((point) => point.day > lastClose),
    );
  const footer = signs.length > 0 || today;

  return (
    <div {...props} className={cn("grid min-w-0 gap-s", className)}>
      <div
        className={cn(
          "min-w-0",
          "pr-0",
          "tablet:pr-[10rem]",
          "desktop:pr-[10rem]",
        )}
      >
        <Chart
          lines={lines}
          label={t("raceCard.label")}
          {...format}
          className={cn(
            "",
            "h-[13rem]",
            "tablet:h-[16rem]",
            "desktop:h-[16rem]",
          )}
          onSelectLine={onFocusMember}
          overlay={(layout) => (
            <LineEnds
              layout={layout}
              members={byId}
              format={format}
              onFocusMember={onFocusMember}
              youId={youId}
              focusId={focusId}
            />
          )}
        />
      </div>
      {footer ? (
        <div
          className={cn(
            "flex-wrap items-center gap-s",
            "flex",
            today ? "tablet:flex" : "tablet:hidden",
            today ? "desktop:flex" : "desktop:hidden",
          )}
        >
          {signs.map((member) => (
            <Sign
              key={member.id}
              member={member}
              role={roleOf(member.id, { youId, focusId })}
              format={format}
              current={member.id === current}
              onFocusMember={onFocusMember}
              className={cn(
                "",
                "inline-flex",
                "tablet:hidden",
                "desktop:hidden",
              )}
            />
          ))}
          {today ? <NotFinalKey /> : null}
        </div>
      ) : null}
    </div>
  );
}
