import type { Portfolio, PortfolioBalanceHistory } from "@fpr/contracts";
import { PlusIcon } from "@phosphor-icons/react/Plus";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../components/atoms/button/button";
import { Chart } from "../../../components/molecules/chart/chart";
import {
  MarkKey,
  NotFinalKey,
} from "../../../components/molecules/chart/chart-key";
import { cn } from "../../../lib/cn";
import { useLanguage } from "../../../lib/i18n";
import type { MemberColor } from "../../../lib/member-color";
import * as ChartCard from "../-portfolio-sections/chart-card";
import type { RecordLink } from "../-portfolio-sections/record-link";
import { balanceLine } from "./balance-line";

/** The balance over the period with its marks, and what the marks and the dashed end mean: Portfolio's chart, and Record a change's once saved. */
export function Balance({
  history,
  color,
}: {
  history: PortfolioBalanceHistory;
  color: MemberColor;
}) {
  const { t } = useTranslation();
  const language = useLanguage();
  const line = useMemo(
    () => balanceLine(history, color, t, language),
    [history, color, t, language],
  );
  const lines = useMemo(() => [line], [line]);

  const marks = line.marks ?? [];
  const bought = marks.some((mark) => mark.direction === "up");
  const sold = marks.some((mark) => mark.direction === "down");
  const today = history.points.some((point) => point.provisional);

  return (
    <>
      <Chart
        lines={lines}
        label={t("portfolioPage.chart")}
        unit="money"
        precision="euros"
        className={ChartCard.PLOT}
      />
      {bought || sold || today ? (
        <ChartCard.Key>
          {bought ? (
            <MarkKey direction="up">{t("portfolioPage.purchase")}</MarkKey>
          ) : null}
          {sold ? (
            <MarkKey direction="down">{t("portfolioPage.sale")}</MarkKey>
          ) : null}
          {today ? <NotFinalKey /> : null}
        </ChartCard.Key>
      ) : null}
    </>
  );
}

/**
 * Portfolio's chart card, the page's hero: the balance over the period with
 * ▲ for each purchase and ▼ for each sale, then how the portfolio splits. On
 * phone, Record a change follows it at full width.
 */
export function PortfolioChart({
  history,
  portfolio,
  color,
  recordLink,
}: {
  /** The balance over the period, or `undefined` while it loads. */
  history: PortfolioBalanceHistory | undefined;
  portfolio: Portfolio;
  /** The viewer's colour, the line's and the split's. */
  color: MemberColor;
  recordLink: RecordLink;
}) {
  const { t } = useTranslation();

  return (
    <>
      <ChartCard.Root>
        {history === undefined ? (
          <ChartCard.Loading />
        ) : (
          <Balance history={history} color={color} />
        )}
        <ChartCard.Split portfolio={portfolio} color={color} titled />
      </ChartCard.Root>
      <Button
        size="wide"
        icon={PlusIcon}
        nativeButton={false}
        render={recordLink()}
        className={cn("", "inline-grid", "tablet:hidden", "desktop:hidden")}
      >
        {t("portfolioPage.record")}
      </Button>
    </>
  );
}
