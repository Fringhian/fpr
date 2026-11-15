import { useRender } from "@base-ui/react/use-render";
import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import { DotsThreeIcon } from "@phosphor-icons/react/DotsThree";
import {
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  useId,
  useMemo,
} from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/cn";
import {
  type Decimal,
  formatDate,
  formatMoney,
  formatPercent,
  formatQuantity,
  formatTime,
  type IsoDate,
  type Timestamp,
} from "../../lib/format";
import { type GainInput, type GainUnit, gainDisplay } from "../../lib/gain";
import { useLanguage } from "../../lib/i18n";
import { Badge } from "../atoms/badge";
import { GainChip } from "../atoms/gain-chip";
import { IconButton } from "../atoms/icon-button";
import { LoadingPlaceholder } from "../atoms/loading-placeholder";
import { TextLink } from "../atoms/text-link";
import { Icon, type IconProps } from "../foundations/icon";
import {
  Chart,
  type ChartColor,
  type ChartLine,
  type ChartPoint,
} from "./chart";
import * as Menu from "./menu";

/** Where a price comes from: a daily close, the 30-minute refresh, or a value point a member entered. */
export type PriceSource = "close" | "intraday" | "manual";

/** A share's latest price, as the API sends it: what one unit was worth, when, and where it comes from. */
export interface HoldingPrice {
  at: Timestamp;
  priceEur: Decimal;
  source: PriceSource;
}

/** The card's ground: a white surface with an outline, its parts stacked. */
const card =
  "relative flex min-w-0 flex-col gap-s rounded-l bg-surface p-m font-sans text-primary shadow-outline";

/** The value line, at the card's foot whatever the height of the cards beside it. */
const foot = "mt-auto flex flex-wrap items-center justify-between gap-s";

const caption = "text-xs text-secondary";

const big = "text-l font-semibold tabular-nums";

interface WeightProps {
  weight: Decimal | null;
}

/** What an anonymous viewer sees in place of an amount: its weight in the portfolio. */
function Weight({ weight }: WeightProps) {
  const { t } = useTranslation();
  const language = useLanguage();

  return weight === null ? null : (
    <span className="flex flex-wrap items-baseline gap-x-xs">
      <span className={big}>{formatPercent(weight, language)}</span>
      <span className={caption}>{t("holdingCard.ofPortfolio")}</span>
    </span>
  );
}

interface NameLinkProps {
  name: string;
  link: ReactElement;
  icon: IconProps["icon"];
}

/**
 * The name as a link to the share's page. Its hit area stretches over the
 * whole card, under the ⋯ button, and its focus ring draws round the card.
 */
function NameLink({ name, link, icon }: NameLinkProps) {
  return useRender({
    render: link,
    defaultTagName: "a",
    props: {
      className: cn(
        "flex min-w-0 items-center gap-xs text-primary no-underline outline-none after:absolute after:inset-[0] after:rounded-l after:content-['']",
        "",
        "",
        "",
        "hover:underline",
        "focus-visible:after:focus-ring",
      ),
      children: (
        <>
          <span className="truncate">{name}</span>
          <Icon icon={icon} size="s" className="text-secondary" />
        </>
      ),
    },
  });
}

interface CurveProps {
  name: string;
  points: readonly ChartPoint[];
  color: ChartColor;
}

/** The share's price over the period, as a sparkline in the colour of the gain. */
function Curve({ name, points, color }: CurveProps) {
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

const CURVE_COLORS = {
  positive: "positive",
  negative: "negative",
  flat: "muted",
} as const satisfies Record<string, ChartColor>;

interface HoldingCardOwnProps {
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
}

export type HoldingCardProps = HoldingCardOwnProps &
  Omit<ComponentProps<"article">, keyof HoldingCardOwnProps | "children">;

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
  actionsIcon = DotsThreeIcon,
  timeZone,
  className,
  ...props
}: HoldingCardProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const nameId = useId();

  const zone = timeZone === undefined ? {} : { timeZone };
  const pending = latestPrice === null;
  const shownGain: GainInput | null =
    gain === null || !anonymous ? gain : { percent: gain.percent };
  const tone =
    shownGain === null
      ? "flat"
      : (gainDisplay(shownGain, unit, language)?.tone ?? "flat");
  const priceTime =
    latestPrice === null
      ? null
      : latestPrice.source === "intraday"
        ? t("holdingCard.asOfTime", {
            time: formatTime(latestPrice.at, language, zone),
          })
        : t(
            latestPrice.source === "manual"
              ? "holdingCard.asOfDate"
              : "holdingCard.closeOf",
            { date: formatDate(latestPrice.at, language, zone) },
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

  return (
    <article
      {...props}
      aria-labelledby={nameId}
      className={cn(card, className)}
    >
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
            <Menu.Trigger
              render={
                <IconButton
                  icon={actionsIcon}
                  label={t("menu.moreFor", { subject: name })}
                  size="s"
                  className={cn(
                    "relative",
                    "",
                    "",
                    "",
                    "popup-open:bg-highlight popup-open:text-primary",
                  )}
                />
              }
            />
            <Menu.Popup>{actions}</Menu.Popup>
          </Menu.Root>
        )}
      </div>
      {details.length === 0 ? null : (
        <p className={caption}>{details.join(" · ")}</p>
      )}
      {pending ? (
        <>
          <LoadingPlaceholder>
            {t("holdingCard.loadingPrices")}
          </LoadingPlaceholder>
          <div className={foot}>
            <Badge state="pricePending" />
            <span className={caption}>{t("holdingCard.notCounted")}</span>
          </div>
        </>
      ) : (
        <>
          {curve.length > 1 ? (
            <Curve name={name} points={curve} color={CURVE_COLORS[tone]} />
          ) : null}
          <div className={foot}>
            {anonymous ? (
              <Weight weight={weight} />
            ) : valueEur === null || valueEur === undefined ? null : (
              <span className={big}>
                {formatMoney(valueEur, language, { precision: "euros" })}
              </span>
            )}
            {shownGain === null ? null : (
              <GainChip gain={shownGain} unit={unit} />
            )}
          </div>
        </>
      )}
    </article>
  );
}

interface CashCardOwnProps {
  /** The cash held, in euros. An anonymous viewer has none. */
  amountEur?: Decimal | null | undefined;
  /** The cash's weight in percent of the balance, shown to an anonymous viewer in place of the amount. */
  weight: Decimal | null;
  /** The day the cash was last set, or the moment of that entry. */
  setOn?: IsoDate | Timestamp | undefined;
  /** The viewer is anonymous: the weight in percent replaces the amount. */
  anonymous?: boolean;
  /** Opens the cash step of Record a change. Without it, the card has no Update cash action. */
  onUpdateCash?: (() => void) | undefined;
  /** The icon that ends Update cash, any Phosphor icon. A caret by default. */
  updateCashIcon?: IconProps["icon"] | undefined;
  /** The time zone a moment's day is read in. The browser's by default. */
  timeZone?: string | undefined;
}

export type CashCardProps = CashCardOwnProps &
  Omit<ComponentProps<"article">, keyof CashCardOwnProps | "children">;

/** The cash someone holds, the last card after their holdings: its amount, the day it was set, and Update cash. */
export function CashCard({
  amountEur,
  weight,
  setOn,
  anonymous = false,
  onUpdateCash,
  updateCashIcon,
  timeZone,
  className,
  ...props
}: CashCardProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const titleId = useId();

  const zone = timeZone === undefined ? {} : { timeZone };

  return (
    <article
      {...props}
      aria-labelledby={titleId}
      className={cn(card, className)}
    >
      <p
        id={titleId}
        className="flex min-h-l items-center text-s font-semibold"
      >
        {t("holdingCard.cash")}
      </p>
      {setOn === undefined ? null : (
        <p className={caption}>
          {t("holdingCard.setOn", {
            date: formatDate(setOn, language, zone),
          })}
        </p>
      )}
      <div className={foot}>
        {anonymous ? (
          <Weight weight={weight} />
        ) : amountEur === null || amountEur === undefined ? null : (
          <span className={big}>
            {formatMoney(amountEur, language, { precision: "euros" })}
          </span>
        )}
        {onUpdateCash === undefined ? null : (
          <TextLink
            toPage
            toPageIcon={updateCashIcon}
            render={<button type="button" />}
            onClick={onUpdateCash}
            className="cursor-pointer bg-transparent text-s"
          >
            {t("holdingCard.updateCash")}
          </TextLink>
        )}
      </div>
    </article>
  );
}
