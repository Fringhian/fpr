import { cn } from "../../../lib/cn";
import { NotFinalKey } from "../../molecules/chart/chart-key";
import type { ChartValueFormat } from "../../molecules/chart/chart-model";
import { Sign } from "./race-card-marks";
import { type RaceCast, type RaceMember, roleOf } from "./race-card-model";

const PHONE_SIGN = cn("", "inline-flex", "tablet:hidden", "desktop:hidden");

type LegendProps = RaceCast & {
  /** You and the focused member, whose signs sit here on phone. */
  signs: readonly RaceMember[];
  /** Whether today's points are drawn, dashed: the key says what they mean. */
  today: boolean;
  format: ChartValueFormat;
  onFocusMember: ((id: string) => void) | undefined;
};

/**
 * Under the chart: on phone, your sign and the focused member's, which the
 * lines' ends have no room for; on every width, the key to today's dashed
 * points. Nothing when there is neither.
 */
export function Legend({
  signs,
  today,
  format,
  onFocusMember,
  youId,
  focusId,
}: LegendProps) {
  if (signs.length === 0 && !today) return null;
  const current = focusId ?? youId;

  return (
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
          className={PHONE_SIGN}
        />
      ))}
      {today ? <NotFinalKey /> : null}
    </div>
  );
}
