// The holding card's parts, imported as a namespace: `import * as HoldingCard from "…/holding-card"`.
import type { Decimal, LatestPrice, ShareKind } from "@fpr/contracts";
import { type ComponentProps, type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";
import type { GainInput, GainUnit } from "../../../lib/gain";
import type { Look } from "../../../lib/look";
import { Badge } from "../../atoms/badge/badge";
import { Picture } from "../../atoms/picture/picture";
import type { IconProps } from "../../foundations/icon/icon";
import type { ChartPoint } from "../chart/chart";
import { Details, Pending, Value } from "./holding-card-figures";
import {
  Actions,
  Header,
  Name,
  type NameProps,
  Root,
} from "./holding-card-parts";

export { Cash, type CashProps } from "./holding-card-cash";
export { Details, Pending, Value } from "./holding-card-figures";
export {
  Actions,
  Caption,
  Figure,
  Foot,
  Header,
  Name,
  type NameProps,
  Root,
} from "./holding-card-parts";

export type BasicProps = {
  name: string;
  /** `manual` for a share members value by hand: a Manual badge, and its value “as of” the day of its last value point. */
  kind?: ShareKind;
  /** The quantity held, the decimal string as entered: `74.328` reads 74.328 units. An anonymous viewer never sees it. */
  quantity: Decimal;
  /** The latest price with its time and source, or `null` while the share's prices haven't arrived: the card then shows it pending, not counted. */
  latestPrice: LatestPrice | null;
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
  /** On someone else's card, the viewer when they hold the share too: their small picture in the card's corner. */
  you?: Look | null | undefined;
  /** The items of the card's ⋯ menu, such as Buy more and Sell (`Menu.Item`, `Menu.LinkItem`). Without them, the card has no ⋯ button. */
  actions?: ReactNode;
  /** The icon of the button that opens `actions`, any Phosphor icon. Three dots by default. */
  actionsIcon?: IconProps["icon"] | undefined;
  /** The time zone a price's time and day are read in. The browser's by default. */
  timeZone?: string | undefined;
} & Pick<NameProps, "link" | "linkIcon"> &
  Omit<
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
    | "you"
    | "actions"
    | "actionsIcon"
    | "timeZone"
    | "children"
  >;

/** The name, linked or not, the Manual badge, the viewer's picture, and the ⋯ menu. */
function BasicHeader({
  nameId,
  name,
  kind,
  link,
  linkIcon,
  you,
  actions,
  actionsIcon,
}: { nameId: string } & Pick<
  BasicProps,
  "name" | "kind" | "link" | "linkIcon" | "you" | "actions" | "actionsIcon"
>) {
  const { t } = useTranslation();

  return (
    <Header>
      <Name id={nameId} link={link} linkIcon={linkIcon}>
        {name}
      </Name>
      {kind === "manual" ? <Badge state="manual" /> : null}
      {you ? (
        <Picture {...you} size="xs" aria-label={t("holdingCard.youHoldIt")} />
      ) : null}
      {actions === undefined ? null : (
        <Actions subject={name} icon={actionsIcon}>
          {actions}
        </Actions>
      )}
    </Header>
  );
}

/**
 * One share someone holds: its name, the quantity as entered with the latest
 * price and its time, a curve over the period, the value and the gain. A
 * manual share carries a badge; a share whose prices haven't arrived shows
 * them loading and is not counted yet. An anonymous viewer sees the weight in
 * percent instead of the quantity and the value.
 */
export function Basic({
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
  linkIcon,
  you,
  actions,
  actionsIcon,
  timeZone,
  ...props
}: BasicProps) {
  const nameId = useId();

  return (
    <Root {...props} aria-labelledby={nameId}>
      <BasicHeader
        nameId={nameId}
        {...{ name, kind, link, linkIcon, you, actions, actionsIcon }}
      />
      <Details
        quantity={quantity}
        latestPrice={latestPrice}
        anonymous={anonymous}
        timeZone={timeZone}
      />
      {latestPrice === null ? (
        <Pending />
      ) : (
        <Value
          name={name}
          curve={curve}
          valueEur={valueEur}
          weight={weight}
          gain={gain}
          unit={unit}
          anonymous={anonymous}
        />
      )}
    </Root>
  );
}
