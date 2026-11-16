import type { IsoDate } from "../../../lib/format";
import type { MemberColor } from "../../../lib/member-color";
import type { ChartLine, ChartPoint } from "../../molecules/chart/chart";

/** A member in the race: who they are, and their gain at each day of the period. */
export interface RaceMember {
  /** The member's id. */
  id: string;
  /** Their display name, or an anonymous viewer's pseudonym. */
  name: string;
  /** Their colour: their line's when it is drawn in colour, and their picture's. */
  color: MemberColor;
  /** Their photo's URL, or `null` for their initial. */
  photo?: string | null | undefined;
  /** Their gain since the period's start, one point per day, in the race's unit. */
  points: readonly ChartPoint[];
}

/** How a member's line stands in the race. */
export type RaceRole = "you" | "focus" | "context";

/** Who is drawn in colour: the viewer and the focused member, whoever is in the race. */
export interface RaceCast {
  /** The viewer's id, when they have a portfolio. */
  youId?: string | null | undefined;
  /** The focused member's id. */
  focusId?: string | null | undefined;
}

/** A member's role: `you` wins over `focus` when the viewer focuses themselves. */
export function roleOf(id: string, { youId, focusId }: RaceCast): RaceRole {
  if (id === youId) return "you";
  if (id === focusId) return "focus";
  return "context";
}

const DRAW_ORDER = { context: 0, you: 1, focus: 2 } as const satisfies Record<
  RaceRole,
  number
>;

/**
 * The race's chart lines: everyone else thin and grey, then you, then the
 * focused member on top, each of you two in their own colour. The members
 * keep their order within each group.
 */
export function raceLines(
  members: readonly RaceMember[],
  cast: RaceCast & {
    /** The last close: the points after it are today's, dashed. */
    lastClose?: IsoDate | undefined;
    /** The viewer's line label, such as “You”. */
    youLabel: string;
  },
): ChartLine[] {
  return members
    .map((member) => ({ member, role: roleOf(member.id, cast) }))
    .toSorted((a, b) => DRAW_ORDER[a.role] - DRAW_ORDER[b.role])
    .map(
      ({ member, role }): ChartLine => ({
        id: member.id,
        label: role === "you" ? cast.youLabel : member.name,
        color: role === "context" ? "muted" : member.color,
        emphasis: role === "context" ? "context" : "focus",
        points: member.points,
        ...(cast.lastClose === undefined
          ? {}
          : { dashedAfter: cast.lastClose }),
      }),
    );
}

/** A mark at a line's end: its id, the height it wants, and its own height. */
export interface EndMark {
  id: string;
  y: number;
  size: number;
}

/**
 * Moves the marks at the lines' ends apart so none overlaps the next, each
 * as close to its line as it can stay, between `top` and `bottom`. Returns
 * each mark's centre, by id. When the marks can't all fit, the first ones
 * overlap at the top.
 */
export function spreadMarks(
  marks: readonly EndMark[],
  { gap, top, bottom }: { gap: number; top: number; bottom: number },
): Map<string, number> {
  const sorted = marks.toSorted((a, b) => a.y - b.y);
  const centres = sorted.map((mark) => mark.y);
  // Down: each mark at least its own half, the gap and the previous half below the previous one.
  sorted.forEach((mark, index) => {
    const previous = sorted[index - 1];
    const floor =
      previous === undefined
        ? top + mark.size / 2
        : (centres[index - 1] ?? 0) + (previous.size + mark.size) / 2 + gap;
    centres[index] = Math.max(centres[index] ?? mark.y, floor);
  });
  // Up: back inside the bottom, pushing the ones above it up, never past the top.
  for (let index = sorted.length - 1; index >= 0; index -= 1) {
    const mark = sorted[index];
    if (mark === undefined) continue;
    const next = sorted[index + 1];
    const ceiling =
      next === undefined
        ? bottom - mark.size / 2
        : (centres[index + 1] ?? 0) - (next.size + mark.size) / 2 - gap;
    centres[index] = Math.max(
      top + mark.size / 2,
      Math.min(centres[index] ?? mark.y, ceiling),
    );
  }
  return new Map(sorted.map((mark, index) => [mark.id, centres[index] ?? 0]));
}
