import type { PricePoint, ShareDetail, ShareHolder } from "@fpr/contracts";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { LoadingPlaceholder } from "../../../components/atoms/loading-placeholder/loading-placeholder";
import {
  Chart,
  type ChartLine,
} from "../../../components/molecules/chart/chart";
import { MarkKey } from "../../../components/molecules/chart/chart-key";
import * as EmptyState from "../../../components/molecules/empty-state/empty-state";
import { formatDate } from "../../../lib/format/date";
import { useLanguage } from "../../../lib/i18n";
import { pricePoints } from "../../../lib/series";
import { useViewState } from "../../../lib/view-state/use-view-state";
import * as ChartCard from "../-portfolio-sections/chart-card";
import { type HolderMarks, holderMarks } from "./holder-marks";

/** Who each arrow's colour is, then what its shape means once a sale shows. */
function Key({ marked }: { marked: readonly HolderMarks[] }) {
  const { t } = useTranslation();

  const sold = marked.some(({ marks }) =>
    marks.some((mark) => mark.direction === "down"),
  );
  return (
    <ChartCard.Key>
      {marked.map(({ id, look }) => (
        <MarkKey key={id} direction="up" color={look.color}>
          {look.name}
        </MarkKey>
      ))}
      {sold ? (
        <>
          <MarkKey direction="up" color="muted">
            {t("portfolioPage.purchase")}
          </MarkKey>
          <MarkKey direction="down" color="muted">
            {t("portfolioPage.sale")}
          </MarkKey>
        </>
      ) : null}
    </ChartCard.Key>
  );
}

/**
 * The share's price over the period, a manual share's in steps, each
 * holder's purchases and sales in the period marked in their colour, then
 * the key naming them.
 */
function PriceLine({
  share,
  points,
  holders,
}: {
  share: ShareDetail;
  points: readonly PricePoint[];
  holders: readonly ShareHolder[];
}) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { setting, anonymous } = useViewState();
  const { lines, marked } = useMemo(() => {
    const drawn = pricePoints(points);
    const marked = holderMarks(holders, drawn[0]?.day, {
      anonymous,
      t,
      language,
    });
    const line: ChartLine = {
      id: share.id,
      label: share.name,
      color: "primary",
      points: drawn,
      steps: share.kind === "manual",
      marks: marked.flatMap(({ marks }) => marks),
    };
    return { lines: [line], marked };
  }, [
    share.id,
    share.name,
    share.kind,
    points,
    holders,
    anonymous,
    t,
    language,
  ]);

  return (
    <>
      <Chart
        lines={lines}
        label={t("sharePage.chart", {
          name: share.name,
          period: t(`sentence.period.${setting.period}.inline`),
        })}
        unit="money"
        className={ChartCard.PLOT}
      />
      {marked.length > 0 ? <Key marked={marked} /> : null}
    </>
  );
}

/** “Prices from 5 Mar 2026”, when the provider's history starts after the first holding. */
function HistoryStart({ day }: { day: string }) {
  const { t } = useTranslation();
  const language = useLanguage();

  return (
    <p className="text-xs text-secondary">
      {t("sharePage.pricesFrom", {
        date: formatDate(day, language, { year: true }),
      })}
    </p>
  );
}

/**
 * The share's chart card: its price over the period with each holder's
 * purchases and sales, and the key naming them. It holds its place while the
 * points load, and while a newly held share's history is fetched. A share
 * nobody has held has no chart yet, and says so.
 */
export function ShareChart({
  share,
  points,
  holders,
}: {
  share: ShareDetail;
  /** The chart's points, or `undefined` while they load. */
  points: readonly PricePoint[] | undefined;
  /** Each member with changes on it, or `undefined` while they load. */
  holders: readonly ShareHolder[] | undefined;
}) {
  const { t } = useTranslation();

  if (holders?.length === 0) {
    return (
      <EmptyState.Root className="py-xl">
        <EmptyState.Icon />
        <EmptyState.Description>{t("sharePage.nobody")}</EmptyState.Description>
      </EmptyState.Root>
    );
  }
  return (
    <ChartCard.Root>
      {points === undefined || holders === undefined ? (
        <ChartCard.Loading />
      ) : points.length === 0 ? (
        <LoadingPlaceholder className={ChartCard.PLOT}>
          {t("sharePage.loadingHistory")}
        </LoadingPlaceholder>
      ) : (
        <PriceLine share={share} points={points} holders={holders} />
      )}
      {share.historyStartsOn ? (
        <HistoryStart day={share.historyStartsOn} />
      ) : null}
    </ChartCard.Root>
  );
}
