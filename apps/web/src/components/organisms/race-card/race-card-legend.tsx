import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import type { ChartValueFormat } from "../../molecules/chart/chart-model";
import { Sign } from "./race-card-marks";
import { type RaceCast, type RaceMember, roleOf } from "./race-card-model";

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
