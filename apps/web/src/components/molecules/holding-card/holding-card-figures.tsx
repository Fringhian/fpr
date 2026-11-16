import type { Decimal, LatestPrice } from "@fpr/contracts";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatDate, formatTime } from "../../../lib/format/date";
import { formatMoney } from "../../../lib/format/money";
import { formatQuantity } from "../../../lib/format/number";
import { type GainInput, type GainUnit, gainDisplay } from "../../../lib/gain";
import { useLanguage } from "../../../lib/i18n";
import { Badge } from "../../atoms/badge/badge";
import { GainChip } from "../../atoms/gain-chip/gain-chip";
import { LoadingPlaceholder } from "../../atoms/loading-placeholder/loading-placeholder";
import {
  Chart,
  type ChartColor,
  type ChartLine,
  type ChartPoint,
} from "../chart/chart";
import { Caption, caption, Figure, Foot } from "./holding-card-parts";

const CURVE_COLORS = {
  positive: "positive",
  negative: "negative",
  flat: "muted",
} as const satisfies Record<string, ChartColor>;

/**
 * The quantity as entered, the latest price, and its time or day:
 * “74.328 units · €40.10 · as of 14:30”. An anonymous viewer reads no
 * quantity. `timeZone` is the one a time and a day are read in.
 */
export function Details({
  quantity,
  latestPrice,
  anonymous,
  timeZone,
}: {
  quantity: Decimal;
  latestPrice: LatestPrice | null;
  anonymous: boolean;
  timeZone: string | undefined;
}) {
  const { t } = useTranslation();
  const language = useLanguage();

  const priceTime =
    latestPrice === null
      ? null
      : latestPrice.source === "intraday"
        ? t("holdingCard.asOfTime", {
            time: formatTime(latestPrice.at, language, { timeZone }),
          })
        : t(
            latestPrice.source === "manual"
              ? "holdingCard.asOfDate"
              : "holdingCard.closeOf",
            { date: formatDate(latestPrice.at, language, { timeZone }) },
          );
  const details = [
    anonymous
      ? null
      : t("holdingCard.units", {
          count: Number(quantity),
          quantity: formatQuantity(quantity, language),
        }),
    latestPrice === null ? null : formatMoney(latestPrice.priceEur, language),
    priceTime,
  ].filter((part) => part !== null);

  return details.length === 0 ? null : <Caption>{details.join(" · ")}</Caption>;
}

/** While the prices are pending: a loading line, and the holding said not counted yet. */
export function Pending() {
  const { t } = useTranslation();

  return (
    <>
      <LoadingPlaceholder>{t("holdingCard.loadingPrices")}</LoadingPlaceholder>
      <Foot>
        <Badge state="pricePending" />
        <span className={caption}>{t("holdingCard.notCounted")}</span>
      </Foot>
    </>
  );
}

/** The share's price over the period, as a sparkline in the colour of the gain. */
function Curve({
  name,
  points,
  color,
}: {
  name: string;
  points: readonly ChartPoint[];
  color: ChartColor;
}) {
  const { t } = useTranslation();
  const lines = useMemo<readonly ChartLine[]>(
    () => [{ id: "price", label: name, color, points }],
    [name, color, points],
  );

  return (
    <Chart
      variant="sparkline"
      unit="money"
      lines={lines}
      label={t("holdingCard.curve", { name })}
    />
  );
}

/**
 * Once priced: the curve in the colour of the gain, then the value and the
 * gain. An anonymous viewer reads the weight, and the gain in percent.
 */
export function Value({
  name,
  curve,
  valueEur,
  weight,
  gain,
  unit,
  anonymous,
}: {
  name: string;
  curve: readonly ChartPoint[];
  valueEur: Decimal | null | undefined;
  weight: Decimal | null;
  gain: GainInput | null;
  unit: GainUnit;
  anonymous: boolean;
}) {
  const language = useLanguage();

  const shownGain: GainInput | null =
    gain === null || !anonymous ? gain : { percent: gain.percent };
  const tone =
    shownGain === null
      ? "flat"
      : (gainDisplay(shownGain, unit, language)?.tone ?? "flat");

  return (
    <>
      {curve.length > 1 ? (
        <Curve name={name} points={curve} color={CURVE_COLORS[tone]} />
      ) : null}
      <Foot>
        <Figure anonymous={anonymous} amountEur={valueEur} weight={weight} />
        {shownGain === null ? null : <GainChip gain={shownGain} unit={unit} />}
      </Foot>
    </>
  );
}
