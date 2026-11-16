import { cn } from "../../../lib/cn";
import type { MemberColor } from "../../../lib/member-color";
import type { ChartLayout } from "../../molecules/chart/chart";
import type { ChartValueFormat } from "../../molecules/chart/chart-model";
import { EndPicture, Sign } from "./race-card-marks";
import {
  type RaceCast,
  type RaceMember,
  type RaceRole,
  roleOf,
  spreadMarks,
} from "./race-card-model";

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
const WIDE = cn("", "hidden", "tablet:block", "desktop:block");

const DOT =
  "pointer-events-none absolute size-[0.625rem] -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-surface";

/** A line's end with its member and role, and `centre`, where its mark sits once nudged apart from the others. */
interface Mark {
  id: string;
  x: number;
  y: number;
  centre: number;
  member: RaceMember;
  role: RaceRole;
}

/** Each line's mark, top to bottom, nudged apart where two would overlap. */
function placeMarks(
  layout: ChartLayout,
  members: ReadonlyMap<string, RaceMember>,
  cast: RaceCast,
): Mark[] {
  const ends = layout.ends.flatMap((end) => {
    const member = members.get(end.id);
    if (member === undefined) return [];
    const role = roleOf(member.id, cast);
    const size = role === "context" ? PICTURE_HEIGHT : SIGN_HEIGHT;
    return [{ ...end, member, role, size }];
  });
  const centres = spreadMarks(ends, {
    gap: MARK_GAP,
    top: 0,
    bottom: layout.height,
  });
  return ends
    .map((end) => ({ ...end, centre: centres.get(end.id) ?? end.y }))
    .toSorted((a, b) => a.centre - b.centre);
}

/** The short strokes that tie a nudged mark back to its line's end. */
function Ties({ marks }: { marks: readonly Mark[] }) {
  return (
    <svg
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 size-full overflow-visible stroke-muted",
        WIDE,
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
  );
}

/** The dots on the ends of the two lines in colour. */
function Dots({ marks }: { marks: readonly Mark[] }) {
  return marks.map((mark) =>
    mark.role === "context" ? null : (
      <span
        key={mark.id}
        aria-hidden
        style={{ left: mark.x, top: mark.y }}
        className={cn(DOT, DOTS[mark.member.color])}
      />
    ),
  );
}

type LineEndsProps = RaceCast & {
  layout: ChartLayout;
  members: ReadonlyMap<string, RaceMember>;
  format: ChartValueFormat;
  onFocusMember: ((id: string) => void) | undefined;
};

/**
 * What the lines end with: a dot on the two lines in colour, and from tablet
 * up, the focused member's and your signs, and every other member's picture,
 * nudged apart where they would overlap and tied to their line.
 */
export function LineEnds({
  layout,
  members,
  format,
  onFocusMember,
  youId,
  focusId,
}: LineEndsProps) {
  const marks = placeMarks(layout, members, { youId, focusId });
  const current = focusId ?? youId;

  return (
    <>
      <Ties marks={marks} />
      <Dots marks={marks} />
      <div className={cn("pointer-events-none absolute inset-0", WIDE)}>
        {marks.map(({ id, x, centre, member, role }) => (
          <div
            key={id}
            style={{ left: x + MARK_OFFSET, top: centre }}
            className="pointer-events-auto absolute flex -translate-y-1/2"
          >
            {role === "context" ? (
              <EndPicture
                member={member}
                current={id === current}
                onFocusMember={onFocusMember}
              />
            ) : (
              <Sign
                member={member}
                role={role}
                format={format}
                current={id === current}
                onFocusMember={onFocusMember}
              />
            )}
          </div>
        ))}
      </div>
    </>
  );
}
