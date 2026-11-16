import type { Id, LatestPrice, PriceChange } from "@fpr/contracts";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { formatMoney } from "../../../lib/format/money";
import type { GainUnit } from "../../../lib/gain";
import { useLanguage } from "../../../lib/i18n";
import type { Look } from "../../../lib/look";
import { usePriceTime } from "../../../lib/price-time";
import { GainChip } from "../../atoms/gain-chip/gain-chip";
import { caption, Foot } from "../holding-card/holding-card-parts";
import { PictureStack } from "../picture-stack/picture-stack";

/**
 * The price line at the card's foot: the latest price with its time under
 * it, then the change of one unit's price over the period, when known, on
 * the same row whatever the price's length.
 */
export function Price({
  latestPrice,
  change,
  unit,
  timeZone,
  className,
  ...props
}: {
  latestPrice: LatestPrice;
  change: PriceChange | null;
  unit: GainUnit;
  /** The time zone the price's time and day are read in. The browser's by default. */
  timeZone?: string | undefined;
} & Omit<ComponentProps<"div">, "children">) {
  const language = useLanguage();
  const priceTime = usePriceTime();

  return (
    <Foot {...props} className={cn("flex-nowrap", className)}>
      <span className="grid min-w-0">
        <span className="truncate text-l font-semibold tabular-nums">
          {formatMoney(latestPrice.priceEur, language)}
        </span>
        <span className={cn(caption, "truncate")}>
          {priceTime(latestPrice, timeZone)}
        </span>
      </span>
      {change === null ? null : <GainChip gain={change} unit={unit} />}
    </Foot>
  );
}

/** Who holds the share now: their pictures, then how many, or that nobody does. */
export function Holders({
  holders,
  className,
  ...props
}: { holders: readonly (Look & { id: Id })[] } & Omit<
  ComponentProps<"div">,
  "children"
>) {
  const { t } = useTranslation();

  return (
    <div {...props} className={cn("flex items-center gap-s", className)}>
      {holders.length > 0 ? (
        <PictureStack people={holders} label={t("shareCard.holders")} />
      ) : null}
      <span className={caption}>
        {t("shareCard.heldBy", { count: holders.length })}
      </span>
    </div>
  );
}
