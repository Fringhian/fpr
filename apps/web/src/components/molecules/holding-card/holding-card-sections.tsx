import type { ReactElement, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  type Decimal,
  formatDate,
  formatMoney,
  formatQuantity,
  formatTime,
} from "../../../lib/format";
import { type GainInput, type GainUnit, gainDisplay } from "../../../lib/gain";
import { useLanguage } from "../../../lib/i18n";
import { Badge } from "../../atoms/badge/badge";
import { GainChip } from "../../atoms/gain-chip/gain-chip";
import { LoadingPlaceholder } from "../../atoms/loading-placeholder/loading-placeholder";
import type { IconProps } from "../../foundations/icon/icon";
import type { ChartColor, ChartPoint } from "../chart/chart";
import * as Menu from "../menu/menu";
import type { HoldingPrice } from "./holding-card";
import {
  CardFigure,
  Curve,
  caption,
  foot,
  NameLink,
} from "./holding-card-parts";

const CURVE_COLORS = {
  positive: "positive",
  negative: "negative",
  flat: "muted",
} as const satisfies Record<string, ChartColor>;

/** The name, linked or not, the Manual badge, and the ⋯ menu. */
export function HoldingHeader({
  nameId,
  name,
  kind,
  link,
  linkIcon,
  actions,
  actionsIcon,
}: {
  nameId: string;
  name: string;
  kind: "market" | "manual";
  link: ReactElement | undefined;
  linkIcon: IconProps["icon"];
  actions: ReactNode;
  actionsIcon: IconProps["icon"] | undefined;
}) {
  return (
    <div className="flex min-h-l items-center gap-s">
      <p id={nameId} className="min-w-0 flex-1 text-s font-semibold">
        {link === undefined ? (
          <span className="block truncate">{name}</span>
        ) : (
          <NameLink name={name} link={link} icon={linkIcon} />
        )}
      </p>
      {kind === "manual" ? <Badge state="manual" /> : null}
      {actions === undefined ? null : (
        <Menu.Root>
          <Menu.MoreTrigger
            subject={name}
            icon={actionsIcon}
            size="s"
            className="relative"
          />
          <Menu.Popup>{actions}</Menu.Popup>
        </Menu.Root>
      )}
    </div>
  );
}

/** The quantity as entered, the latest price, and its time or day: “74.328 units · €40.10 · as of 14:30”. */
export function HoldingDetails({
  quantity,
  latestPrice,
  anonymous,
  timeZone,
}: {
  quantity: Decimal;
  latestPrice: HoldingPrice | null;
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

  return details.length === 0 ? null : (
    <p className={caption}>{details.join(" · ")}</p>
  );
}

/** While the prices are pending: a loading line, and the holding said not counted yet. */
export function PendingFoot() {
  const { t } = useTranslation();

  return (
    <>
      <LoadingPlaceholder>{t("holdingCard.loadingPrices")}</LoadingPlaceholder>
      <div className={foot}>
        <Badge state="pricePending" />
        <span className={caption}>{t("holdingCard.notCounted")}</span>
      </div>
    </>
  );
}

/** Once priced: the curve in the colour of the gain, then the value and the gain. An anonymous viewer reads the weight, and the gain in percent. */
export function PricedFoot({
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
      <div className={foot}>
        <CardFigure
          anonymous={anonymous}
          amountEur={valueEur}
          weight={weight}
        />
        {shownGain === null ? null : <GainChip gain={shownGain} unit={unit} />}
      </div>
    </>
  );
}
