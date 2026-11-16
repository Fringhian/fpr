import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import {
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import {
  type Decimal,
  formatDate,
  formatMoney,
  formatQuantity,
  formatTime,
  type Timestamp,
} from "../../../lib/format";
import { type GainInput, type GainUnit, gainDisplay } from "../../../lib/gain";
import { useLanguage } from "../../../lib/i18n";
import { Badge } from "../../atoms/badge/badge";
import { Card } from "../../atoms/card/card";
import { GainChip } from "../../atoms/gain-chip/gain-chip";
import { LoadingPlaceholder } from "../../atoms/loading-placeholder/loading-placeholder";
import type { IconProps } from "../../foundations/icon/icon";
import type { ChartColor, ChartPoint } from "../chart/chart";
import * as Menu from "../menu/menu";
import {
  CardFigure,
  Curve,
  caption,
  card,
  foot,
  NameLink,
} from "./holding-card-parts";

export { CashCard, type CashCardProps } from "./cash-card";

/** Where a price comes from: a daily close, the 30-minute refresh, or a value point a member entered. */
export type PriceSource = "close" | "intraday" | "manual";

/** A share's latest price, as the API sends it: what one unit was worth, when, and where it comes from. */
export interface HoldingPrice {
  at: Timestamp;
  priceEur: Decimal;
  source: PriceSource;
}

export type HoldingCardProps = {
  /** The share's name. */
  name: string;
  /** `manual` for a share members value by hand: a Manual badge, and its value “as of” the day of its last value point. */
  kind?: "market" | "manual";
  /** The quantity held, the decimal string as entered: `74.328` reads 74.328 units. An anonymous viewer never sees it. */
  quantity: Decimal;
  /** The latest price with its time and source, or `null` while the share's prices haven't arrived: the card then shows it pending, not counted. */
  latestPrice: HoldingPrice | null;
  /** The share's price over the period, one point per day, for the curve. Pass a stable array. */
  curve: readonly ChartPoint[];
  /** The holding's value in euros. `null` while pending; an anonymous viewer has none. */
  valueEur?: Decimal | null | undefined;
  /** The holding's weight in percent of the holder's balance, shown to an anonymous viewer in place of the quantity and the value. */
  weight: Decimal | null;
  /** The holding's gain over the period. `null` while pending. */
  gain: GainInput | null;
  /** The unit setting, `eur` or `percent`, the gain reads in. An anonymous viewer reads percent. */
  unit: GainUnit;
  /** The viewer is anonymous: the weight in percent replaces the quantity and the value, and the gain reads in percent. */
  anonymous?: boolean;
  /** Makes the card open the share's page: an `<a href>`, or the router's link, `<Link to="/shares/$shareId" … />`. The name then ends with `linkIcon`. */
  link?: ReactElement | undefined;
  /** The icon that ends a linked name, any Phosphor icon. A caret by default. */
  linkIcon?: IconProps["icon"] | undefined;
  /** The items of the card's ⋯ menu, such as Buy more and Sell (`Menu.Item`, `Menu.LinkItem`). Without them, the card has no ⋯ button. */
  actions?: ReactNode;
  /** The icon of the button that opens `actions`, any Phosphor icon. Three dots by default. */
  actionsIcon?: IconProps["icon"] | undefined;
  /** The time zone a price's time and day are read in. The browser's by default. */
  timeZone?: string | undefined;
} & Omit<
  ComponentProps<"article">,
  | "name"
  | "kind"
  | "quantity"
  | "latestPrice"
  | "curve"
  | "valueEur"
  | "weight"
  | "gain"
  | "unit"
  | "anonymous"
  | "link"
  | "linkIcon"
  | "actions"
  | "actionsIcon"
  | "timeZone"
  | "children"
>;

const CURVE_COLORS = {
  positive: "positive",
  negative: "negative",
  flat: "muted",
} as const satisfies Record<string, ChartColor>;

/** The name, linked or not, the Manual badge, and the ⋯ menu. */
function HoldingHeader({
  nameId,
  name,
  kind,
  link,
  linkIcon,
  actions,
  actionsIcon,
}: Pick<
  HoldingCardProps,
  "name" | "kind" | "link" | "actions" | "actionsIcon"
> & { nameId: string; linkIcon: IconProps["icon"] }) {
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
function HoldingDetails({
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
function PendingFoot() {
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

/**
 * One share someone holds: its name, the quantity as entered with the latest
 * price and its time, a curve over the period, the value and the gain. A
 * manual share carries a badge; a share whose prices haven't arrived shows
 * them loading and is not counted yet. An anonymous viewer sees the weight in
 * percent instead of the quantity and the value.
 */
export function HoldingCard({
  name,
  kind = "market",
  quantity,
  latestPrice,
  curve,
  valueEur,
  weight,
  gain,
  unit,
  anonymous = false,
  link,
  linkIcon = CaretRightIcon,
  actions,
  actionsIcon,
  timeZone,
  className,
  ...props
}: HoldingCardProps) {
  const language = useLanguage();
  const nameId = useId();

  const shownGain: GainInput | null =
    gain === null || !anonymous ? gain : { percent: gain.percent };
  const tone =
    shownGain === null
      ? "flat"
      : (gainDisplay(shownGain, unit, language)?.tone ?? "flat");

  return (
    <Card
      {...props}
      render={<article />}
      aria-labelledby={nameId}
      className={cn(card, className)}
    >
      <HoldingHeader
        nameId={nameId}
        name={name}
        kind={kind}
        link={link}
        linkIcon={linkIcon}
        actions={actions}
        actionsIcon={actionsIcon}
      />
      <HoldingDetails
        quantity={quantity}
        latestPrice={latestPrice}
        anonymous={anonymous}
        timeZone={timeZone}
      />
      {latestPrice === null ? (
        <PendingFoot />
      ) : (
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
            {shownGain === null ? null : (
              <GainChip gain={shownGain} unit={unit} />
            )}
          </div>
        </>
      )}
    </Card>
  );
}
