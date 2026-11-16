// The share card's parts, imported as a namespace: `import * as ShareCard from "…/share-card"`.
import type {
  Id,
  LatestPrice,
  PriceChange,
  ShareSummary,
} from "@fpr/contracts";
import { type ComponentProps, type ReactElement, useId } from "react";
import { useTranslation } from "react-i18next";
import type { GainUnit } from "../../../lib/gain";
import type { Look } from "../../../lib/look";
import { useShareLine } from "../../../lib/share-line";
import { Badge } from "../../atoms/badge/badge";
import { LoadingPlaceholder } from "../../atoms/loading-placeholder/loading-placeholder";
import type { ChartPoint } from "../chart/chart";
import {
  Caption,
  Curve,
  Header,
  Name,
  Root,
} from "../holding-card/holding-card";
import { Holders, Price } from "./share-card-parts";

export {
  Caption,
  Curve,
  Foot,
  Header,
  Name,
  Root,
} from "../holding-card/holding-card";
export { Holders, Price } from "./share-card-parts";

export type BasicProps = Pick<
  ShareSummary,
  "name" | "kind" | "isin" | "symbol"
> & {
  /** `m`, the whole card, for a share someone holds; `s`, its name and one line, for a share nobody holds. */
  size?: "m" | "s" | undefined;
  /** The latest price with its time and source, or `null` while the share's prices haven't arrived. */
  latestPrice: LatestPrice | null;
  /** The change of one unit's price over the period, or `null` without a price at its start. */
  change: PriceChange | null;
  /** The share's price over the period, one point per day, for the curve. Pass a stable array. */
  curve: readonly ChartPoint[];
  /** The unit setting, `eur` or `percent`, the change reads in. */
  unit: GainUnit;
  /** The members holding it now. */
  holders: readonly (Look & { id: Id })[];
  /** Opens the share's page: an `<a href>`, or the router's link, `<Link to="/shares/$shareId" … />`. */
  link: ReactElement;
  /** The time zone a price's time and day are read in. The browser's by default. */
  timeZone?: string | undefined;
} & Omit<ComponentProps<"article">, "name" | "size" | "children">;

/** While the prices are pending: a loading line and the Price pending badge. */
function Pending() {
  const { t } = useTranslation();

  return (
    <>
      <LoadingPlaceholder>{t("holdingCard.loadingPrices")}</LoadingPlaceholder>
      <Badge state="pricePending" className="self-start" />
    </>
  );
}

/**
 * A share FPR knows: its name with a caret to its page, a Manual badge for a
 * manual share, its symbol and ISIN or “Value entered by members”, the curve
 * over the period, the latest price with its time and the change, then who
 * holds it. `size="s"` keeps the name and one line, symbol and price, for a
 * share nobody holds.
 */
export function Basic({
  size = "m",
  name,
  kind,
  isin,
  symbol,
  latestPrice,
  change,
  curve,
  unit,
  holders,
  link,
  timeZone,
  ...props
}: BasicProps) {
  const { t } = useTranslation();
  const line = useShareLine();
  const nameId = useId();

  return (
    <Root {...props} aria-labelledby={nameId}>
      <Header>
        <Name id={nameId} link={link}>
          {name}
        </Name>
        {kind === "manual" && size === "m" ? <Badge state="manual" /> : null}
      </Header>
      {size === "s" ? (
        <Caption>{line({ symbol, latestPrice })}</Caption>
      ) : (
        <>
          <Caption className="truncate">
            {kind === "manual"
              ? t("shareCard.manual")
              : [symbol, isin].filter(Boolean).join(" · ")}
          </Caption>
          {latestPrice === null ? (
            <Pending />
          ) : (
            <>
              <Curve name={name} points={curve} gain={change} unit={unit} />
              <Price
                latestPrice={latestPrice}
                change={change}
                unit={unit}
                timeZone={timeZone}
              />
            </>
          )}
          <Holders holders={holders} />
        </>
      )}
    </Root>
  );
}
