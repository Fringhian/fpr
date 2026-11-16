import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { useLanguage } from "../../../lib/i18n";
import { Picture } from "../../atoms/picture/picture";
import { TrailSign } from "../../atoms/trail-sign/trail-sign";
import {
  type ChartValueFormat,
  formatChartValue,
  lastPoint,
} from "../../molecules/chart/chart-model";
import type { RaceMember, RaceRole } from "./race-card-model";

/** What a mark needs to focus its member when selected; without `onFocusMember`, nothing is selectable. */
interface FocusProps {
  member: RaceMember;
  current: boolean;
  onFocusMember: ((id: string) => void) | undefined;
  className?: string;
}

/** A mark's frame: a button that focuses its member, or a plain span when nothing is selectable. */
function FocusFrame({
  member,
  current,
  onFocusMember,
  className,
  label,
  button,
  children,
}: FocusProps & { label?: string; button: string; children: ReactNode }) {
  if (!onFocusMember) return <span className={className}>{children}</span>;

  return (
    <button
      type="button"
      aria-label={label}
      aria-current={current || undefined}
      onClick={() => onFocusMember(member.id)}
      className={cn(button, className)}
    >
      {children}
    </button>
  );
}

const SIGN_BUTTON = cn(
  "group cursor-pointer rounded-full",
  "",
  "",
  "",
  "focus-visible:focus-ring",
);

/** A trail sign naming you or the focused member, with their latest value written like the chart's axis. */
export function Sign({
  role,
  format,
  ...focus
}: FocusProps & { role: RaceRole; format: ChartValueFormat }) {
  const { t } = useTranslation();
  const language = useLanguage();

  const { member } = focus;
  const name = role === "you" ? t("raceCard.you") : member.name;
  const last = lastPoint(member);
  const value =
    last === undefined ? null : formatChartValue(last.value, language, format);

  return (
    <FocusFrame {...focus} button={SIGN_BUTTON}>
      <TrailSign
        person={member}
        className={cn("", "", "", "", "group-hover:bg-highlight")}
      >
        <span className="max-w-[5rem] truncate">{name}</span>
        {value === null ? null : <span className="tabular-nums">{value}</span>}
      </TrailSign>
    </FocusFrame>
  );
}

const PICTURE_BUTTON = cn(
  "flex cursor-pointer rounded-full shadow-[0_0_0_1.5px_transparent]",
  "",
  "",
  "",
  "hover:shadow-[0_0_0_1.5px_var(--color-primary)]",
  "focus-visible:focus-ring",
);

/** The picture at the end of a grey line, which names it. */
export function EndPicture(focus: FocusProps) {
  const { t } = useTranslation();

  const { member, onFocusMember, className } = focus;
  const selectable = onFocusMember !== undefined;

  return (
    <FocusFrame
      {...focus}
      className={cn(selectable ? "" : "flex", className)}
      label={t("raceCard.focusOn", { name: member.name })}
      button={PICTURE_BUTTON}
    >
      <Picture
        aria-hidden={selectable ? true : undefined}
        name={member.name}
        color={member.color}
        photo={member.photo ?? null}
        size="xs"
      />
    </FocusFrame>
  );
}
