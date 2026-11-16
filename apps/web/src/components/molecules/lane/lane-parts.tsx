import { Collapsible } from "@base-ui/react/collapsible";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { barScale, type UnitScale } from "../../../lib/bar-track";
import { cn } from "../../../lib/cn";
import {
  type Decimal,
  formatDate,
  formatMoney,
  type IsoDate,
} from "../../../lib/format";
import { useLanguage } from "../../../lib/i18n";
import { type LaneValue, laneAmount } from "../../../lib/lane";
import type { MemberColor } from "../../../lib/member-color";
import { Badge } from "../../atoms/badge/badge";
import { BarTrack } from "../../atoms/bar-track/bar-track";
import { Chip } from "../../atoms/chip/chip";
import { GainValue } from "../../atoms/gain-value/gain-value";

/** A member's best holding over the period, the share that did best for them. */
export interface LaneBest {
  share: string;
  /** Its gain over the period, in percent, or `null` from a start at zero. */
  percent: Decimal | null;
}

/** “· you” after the viewer's own name, in a lane or the focus panel. */
export function YouSuffix() {
  const { t } = useTranslation();

  return <span className="font-normal text-secondary"> {t("lane.you")}</span>;
}

/** The name, then the best share from tablet up, then “since” and “Incomplete” when they apply. */
export function LaneName({
  name,
  you,
  best,
  measuredFrom,
  incomplete,
}: {
  name: string;
  you: boolean;
  best: LaneBest | null;
  measuredFrom: IsoDate | null;
  incomplete: boolean;
}) {
  const { t } = useTranslation();
  const language = useLanguage();

  const hasMarkers = incomplete || measuredFrom !== null;

  return (
    <span className="flex min-w-0 flex-col">
      <span
        className={cn(
          "truncate font-semibold",
          "text-s",
          "tablet:text-m",
          "desktop:text-m",
        )}
      >
        {name}
        {you ? <YouSuffix /> : null}
      </span>
      {best ? (
        <span
          className={cn(
            "truncate text-xs text-secondary",
            "hidden",
            "tablet:block",
            "desktop:block",
          )}
        >
          {t("lane.best", { share: best.share })}
        </span>
      ) : null}
      {hasMarkers ? (
        <span className="flex flex-wrap items-center gap-x-s gap-y-xs pt-xs">
          {measuredFrom === null ? null : (
            <span className="text-xs text-secondary">
              {t("lane.since", { date: formatDate(measuredFrom, language) })}
            </span>
          )}
          {incomplete ? <Badge state="incomplete" /> : null}
        </span>
      ) : null}
    </span>
  );
}

/** The bar of the lane's value, on the standings' scale of the unit it reads in, or on its own. */
export function LaneBar({
  value,
  scale,
  color,
}: {
  value: LaneValue;
  scale: UnitScale | undefined;
  color: MemberColor;
}) {
  const shown = laneAmount(value);
  const amount = shown === null ? null : Number(shown.amount);
  const unit = shown?.unit ?? (value.board === "gain" ? value.unit : "eur");

  return (
    <BarTrack
      amount={amount}
      scale={scale?.[unit] ?? barScale([amount])}
      color={color}
      size="m"
    />
  );
}

/** The lane's value: the signed gain in its colour, or the balance in whole euros. */
export function LaneFigure({ value }: { value: LaneValue }) {
  const language = useLanguage();

  return (
    <span
      className={cn("text-end", "text-s", "tablet:text-m", "desktop:text-m")}
    >
      {value.board === "gain" ? (
        <GainValue
          gain={value.gain}
          unit={value.unit}
          precision="euros"
          className="whitespace-nowrap"
        />
      ) : value.balance === null ? null : (
        <span className="font-semibold whitespace-nowrap tabular-nums">
          {formatMoney(value.balance, language, { precision: "euros" })}
        </span>
      )}
    </span>
  );
}

/**
 * What the opened lane shows under its row: the best share on phone, then
 * `children` at every width. Its height eases open and shut, clipped below
 * only, so a focus ring inside still shows at the top.
 */
export function LanePanel({
  best,
  children,
}: {
  best: LaneBest | null;
  children: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <Collapsible.Panel
      className={cn(
        "h-(--collapsible-panel-height) transition-[height] duration-m ease-soft [clip-path:inset(-0.25rem_-0.25rem_0_-0.25rem)]",
        "",
        // With nothing but the best share, the panel opens on phone only.
        children ? "" : "tablet:hidden",
        children ? "" : "desktop:hidden",
        "starting-style:h-0",
        "ending-style:h-0",
        "motion-reduce:transition-none",
      )}
    >
      <div
        className={cn(
          "flex flex-col items-start gap-s",
          "ps-[2.875rem] pe-s pb-m",
          "tablet:ps-[3.375rem] tablet:pe-[0.75rem] tablet:pb-m",
          "desktop:ps-[3.375rem] desktop:pe-[0.75rem] desktop:pb-m",
        )}
      >
        {best ? (
          <span
            className={cn(
              "items-center gap-s text-xs text-secondary",
              "flex",
              "tablet:hidden",
              "desktop:hidden",
            )}
          >
            <span>{t("lane.bestShare")}</span>
            <Chip gain={best.percent ?? undefined}>{best.share}</Chip>
          </span>
        ) : null}
        {children}
      </div>
    </Collapsible.Panel>
  );
}
