import type { Decimal, LatestPrice } from "@fpr/contracts";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { formatMoney } from "../../../lib/format/money";
import { formatQuantity } from "../../../lib/format/number";
import { type GainInput, type GainUnit, gainDisplay } from "../../../lib/gain";
import { useLanguage } from "../../../lib/i18n";
import { usePriceTime } from "../../../lib/price-time";
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
  quantity: Decimal | null;
  latestPrice: LatestPrice | null;
  anonymous: boolean;
  timeZone: string | undefined;
}) {
  const { t } = useTranslation();
  const language = useLanguage();
  const priceTimeOf = usePriceTime();

  const priceTime =
    latestPrice === null ? null : priceTimeOf(latestPrice, timeZone);
  const details = [
    anonymous || quantity === null
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

/**
 * The share's price over the period, as a sparkline in the colour of `gain`
 * read in `unit`: green up, red down, grey flat or unknown. Nothing with
 * fewer than two points.
 */
export function Curve({
  name,
  points,
  gain,
  unit,
}: {
  name: string;
  points: readonly ChartPoint[];
  gain: GainInput | null;
  unit: GainUnit;
}) {
  const { t } = useTranslation();
  const language = useLanguage();

  const tone =
    gain === null
      ? "flat"
      : (gainDisplay(gain, unit, language)?.tone ?? "flat");
  const color = CURVE_COLORS[tone];
  const lines = useMemo<readonly ChartLine[]>(
    () => [{ id: "price", label: name, color, points }],
    [name, color, points],
  );

  return points.length > 1 ? (
    <Chart
      variant="sparkline"
      unit="money"
      lines={lines}
      label={t("holdingCard.curve", { name })}
    />
  ) : null;
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
  const shownGain: GainInput | null =
    gain === null || !anonymous ? gain : { percent: gain.percent };

  return (
    <>
      <Curve name={name} points={curve} gain={shownGain} unit={unit} />
      <Foot>
        <Figure anonymous={anonymous} amountEur={valueEur} weight={weight} />
        {shownGain === null ? null : <GainChip gain={shownGain} unit={unit} />}
      </Foot>
    </>
  );
}
