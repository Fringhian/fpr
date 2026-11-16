import { CaretRightIcon } from "@phosphor-icons/react/CaretRight";
import {
  type ComponentProps,
  type ReactElement,
  type ReactNode,
  useId,
} from "react";
import { cn } from "../../../lib/cn";
import type { Decimal, Timestamp } from "../../../lib/format";
import type { GainInput, GainUnit } from "../../../lib/gain";
import { Card } from "../../atoms/card/card";
import type { IconProps } from "../../foundations/icon/icon";
import type { ChartPoint } from "../chart/chart";
import { card } from "./holding-card-parts";
import {
  HoldingDetails,
  HoldingHeader,
  PendingFoot,
  PricedFoot,
} from "./holding-card-sections";

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
  const nameId = useId();

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
        <PricedFoot
          name={name}
          curve={curve}
          valueEur={valueEur}
          weight={weight}
          gain={gain}
          unit={unit}
          anonymous={anonymous}
        />
      )}
    </Card>
  );
}
