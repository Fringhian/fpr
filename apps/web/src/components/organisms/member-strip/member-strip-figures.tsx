import type { Decimal } from "@fpr/contracts";
import { type ComponentProps, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { formatMoney } from "../../../lib/format/money";
import type { GainInput, GainUnit } from "../../../lib/gain";
import { useLanguage } from "../../../lib/i18n";
import type { MemberColor } from "../../../lib/member-color";
import { GainValue } from "../../atoms/gain-value/gain-value";
import {
  Chart,
  type ChartLine,
  type ChartPoint,
} from "../../molecules/chart/chart";
import { gainFormat } from "../../molecules/chart/chart-model";

export type CurveProps = {
  /** The member's name, which names the curve. */
  name: string;
  color: MemberColor;
  /** Their gain over the period, one point per day, in the unit. Pass a stable array. */
  points: readonly ChartPoint[];
  /** The viewer's gain over the same days, drawn faded behind; none on the viewer's own strip, or for a viewer with no portfolio. Pass a stable array. */
  yours?: readonly ChartPoint[] | undefined;
  unit: GainUnit;
} & Omit<ComponentProps<"div">, "color" | "children">;

/** The member's gain over the period in their colour, the viewer's faded behind it. */
export function Curve({
  name,
  color,
  points,
  yours,
  unit,
  className,
  ...props
}: CurveProps) {
  const { t } = useTranslation();
  const you = t("raceCard.you");
  const lines = useMemo<ChartLine[]>(
    () => [
      ...(yours === undefined
        ? []
        : [
            {
              id: "you",
              label: you,
              color: "muted",
              emphasis: "context",
              points: yours,
            } satisfies ChartLine,
          ]),
      { id: "member", label: name, color, points },
    ],
    [name, color, points, yours, you],
  );

  return (
    <Chart
      {...props}
      variant="sparkline"
      {...gainFormat(unit)}
      lines={lines}
      label={t(
        yours === undefined ? "memberStrip.curve" : "memberStrip.curveVsYou",
        {
          name,
        },
      )}
      className={cn(
        "[grid-area:curve]",
        "h-[1.875rem]",
        "tablet:h-[3.25rem]",
        "desktop:h-[3.25rem]",
        className,
      )}
    />
  );
}

/** “No shares yet” in the curve's place: a line on phone, a dashed box from tablet up. */
export function NoShares({ className, ...props }: ComponentProps<"p">) {
  const { t } = useTranslation();

  return (
    <p
      {...props}
      className={cn(
        "flex items-center rounded-s border-dashed border-divider text-xs text-secondary [grid-area:curve]",
        "h-auto justify-start border-0",
        "tablet:h-[3.25rem] tablet:justify-center tablet:border-[0.09375rem]",
        "desktop:h-[3.25rem] desktop:justify-center desktop:border-[0.09375rem]",
        className,
      )}
    >
      {t("memberStrip.noShares")}
    </p>
  );
}

export type FiguresProps = {
  /** Their gain over the period, or `null` before their first entry: a dash. */
  gain: GainInput | null;
  unit: GainUnit;
  /** Their balance in euros, under the gain from tablet up. An anonymous viewer has none. */
  balanceEur?: Decimal | null | undefined;
} & Omit<ComponentProps<"div">, "children">;

/** The gain over the period, and the balance under it from tablet up. */
export function Figures({
  gain,
  unit,
  balanceEur,
  className,
  ...props
}: FiguresProps) {
  const { t } = useTranslation();
  const language = useLanguage();

  return (
    <div
      {...props}
      className={cn("grid justify-items-end [grid-area:figures]", className)}
    >
      {gain === null ? (
        <span className="text-l text-secondary">
          <span aria-hidden="true">–</span>
          <span className="sr-only">{t("memberStrip.noGain")}</span>
        </span>
      ) : (
        <GainValue
          gain={gain}
          unit={unit}
          precision="euros"
          className="text-l whitespace-nowrap"
        />
      )}
      {balanceEur == null ? null : (
        <span
          className={cn(
            "text-xs text-secondary tabular-nums",
            "hidden",
            "tablet:inline",
            "desktop:inline",
          )}
        >
          {formatMoney(balanceEur, language, { precision: "euros" })}
        </span>
      )}
    </div>
  );
}
