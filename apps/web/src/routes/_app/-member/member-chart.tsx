import type { Portfolio, PortfolioBalanceHistory } from "@fpr/contracts";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Picture } from "../../../components/atoms/picture/picture";
import {
  Chart,
  type ChartLine,
} from "../../../components/molecules/chart/chart";
import { NotFinalKey } from "../../../components/molecules/chart/chart-key";
import { gainFormat } from "../../../components/molecules/chart/chart-model";
import type { GainUnit } from "../../../lib/gain";
import type { Look } from "../../../lib/look";
import { gainPoints, lastCloseOf } from "../../../lib/series";
import * as ChartCard from "../-portfolio-sections/chart-card";

type History = PortfolioBalanceHistory["points"];

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
    <ChartCard.Key>
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
    </ChartCard.Key>
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
        className={ChartCard.PLOT}
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
    <ChartCard.Root>
      {props.history === undefined ? (
        <ChartCard.Loading />
      ) : (
        <Curves {...props} history={props.history} />
      )}
      <ChartCard.Split portfolio={portfolio} color={props.member.color} />
    </ChartCard.Root>
  );
}
