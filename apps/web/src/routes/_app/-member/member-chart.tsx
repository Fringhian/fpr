import type { Portfolio, PortfolioBalanceHistory } from "@fpr/contracts";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../../../components/atoms/card/card";
import { LoadingPlaceholder } from "../../../components/atoms/loading-placeholder/loading-placeholder";
import { Picture } from "../../../components/atoms/picture/picture";
import { AllocationBar } from "../../../components/molecules/allocation-bar/allocation-bar";
import {
  Chart,
  type ChartLine,
} from "../../../components/molecules/chart/chart";
import { NotFinalKey } from "../../../components/molecules/chart/chart-key";
import { gainFormat } from "../../../components/molecules/chart/chart-model";
import { cn } from "../../../lib/cn";
import type { GainUnit } from "../../../lib/gain";
import type { Look } from "../../../lib/look";
import { gainPoints, lastCloseOf } from "../../../lib/series";

const CHART = cn("", "h-[13rem]", "tablet:h-[15rem]", "desktop:h-[15rem]");

type History = PortfolioBalanceHistory["points"];

/** Their line in their colour, on top of the viewer's, thin and grey behind it. */
function useLines(
  member: Look,
  points: History,
  yours: History | undefined,
  unit: GainUnit,
): ChartLine[] {
  const { t } = useTranslation();
  const you = t("raceCard.you");

  return useMemo(() => {
    const dashedAfter = lastCloseOf(points);
    const dashed = dashedAfter === undefined ? {} : { dashedAfter };
    const theirs: ChartLine = {
      id: "member",
      label: member.name,
      color: member.color,
      points: gainPoints(points, unit),
      ...dashed,
    };
    return yours === undefined
      ? [theirs]
      : [
          {
            id: "you",
            label: you,
            color: "muted",
            emphasis: "context",
            points: gainPoints(yours, unit),
            ...dashed,
          },
          theirs,
        ];
  }, [member.name, member.color, points, yours, unit, you]);
}

/** Who each line is: their picture and name, a grey stroke for “You”, and what the dashed end means. */
function Legend({
  member,
  you,
  today,
}: {
  member: Look;
  you: boolean;
  today: boolean;
}) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-wrap items-center gap-x-m gap-y-xs text-xs text-secondary">
      <span className="inline-flex items-center gap-xs">
        <Picture aria-hidden {...member} size="xs" />
        {member.name}
      </span>
      {you ? (
        <span className="inline-flex items-center gap-xs">
          <span
            aria-hidden
            className="h-[0.125rem] w-m rounded-full bg-muted"
          />
          {t("raceCard.you")}
        </span>
      ) : null}
      {today ? <NotFinalKey /> : null}
    </div>
  );
}

export type MemberChartProps = {
  member: Look;
  /** Their balance over the period, or `undefined` while it loads. */
  history: PortfolioBalanceHistory | undefined;
  /** The viewer's, when they are in the race too. */
  yourHistory: PortfolioBalanceHistory | undefined;
  /** Their portfolio, for how it splits, once it loads. */
  portfolio: Portfolio | undefined;
  unit: GainUnit;
};

/** Their curve against the viewer's, under it how their portfolio splits. */
function Curves({
  member,
  history,
  yourHistory,
  unit,
}: Omit<MemberChartProps, "history" | "portfolio"> & {
  history: PortfolioBalanceHistory;
}) {
  const { t } = useTranslation();
  const lines = useLines(member, history.points, yourHistory?.points, unit);

  const you = yourHistory !== undefined;
  const label = you ? "memberPage.chartVsYou" : "memberPage.chart";

  return (
    <>
      <Chart
        lines={lines}
        label={t(label, { name: member.name })}
        {...gainFormat(unit)}
        className={CHART}
      />
      <Legend
        member={member}
        you={you}
        today={history.points.some((point) => point.provisional)}
      />
    </>
  );
}

/**
 * A member's chart card, the first card on the ridge: their gain over the
 * period in their colour against the viewer's in grey, both named under it,
 * then how their portfolio splits.
 */
export function MemberChart({ portfolio, ...props }: MemberChartProps) {
  return (
    <Card
      elevation="rest"
      className={cn("grid min-w-0 gap-m", "p-m", "tablet:p-l", "desktop:p-l")}
    >
      {props.history === undefined ? (
        <LoadingPlaceholder className={CHART} />
      ) : (
        <Curves {...props} history={props.history} />
      )}
      {portfolio === undefined ? null : (
        <AllocationBar
          color={props.member.color}
          holdings={portfolio.holdings.map(({ share, weight }) => ({
            id: share.id,
            name: share.name,
            weight,
          }))}
          cashWeight={portfolio.cashWeight}
        />
      )}
    </Card>
  );
}
