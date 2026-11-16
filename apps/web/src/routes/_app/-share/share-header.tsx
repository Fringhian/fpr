import type { ShareDetail, ShareValue } from "@fpr/contracts";
import type { ReactNode } from "react";
import { Badge } from "../../../components/atoms/badge/badge";
import { Chip } from "../../../components/atoms/chip/chip";
import { cn } from "../../../lib/cn";
import { SharePrice } from "./share-price";

/**
 * Its ISIN, exchange and currency: one grey line on phone, chips from
 * tablet up. A manual share's Manual badge and `edit` follow.
 */
function Facts({ share, edit }: { share: ShareDetail; edit: ReactNode }) {
  const facts = [share.isin, share.exchange, share.tradingCurrency].filter(
    (fact) => fact !== null,
  );

  return (
    <div className="flex flex-wrap items-center gap-x-s gap-y-xs">
      <span
        className={cn(
          "text-xs text-secondary tabular-nums",
          "inline",
          "tablet:hidden",
          "desktop:hidden",
        )}
      >
        {facts.join(" · ")}
      </span>
      {facts.map((fact) => (
        <Chip
          key={fact}
          className={cn(
            "font-medium tabular-nums",
            "hidden",
            "tablet:inline-flex",
            "desktop:inline-flex",
          )}
        >
          {fact}
        </Chip>
      ))}
      {share.kind === "manual" ? <Badge state="manual" /> : null}
      {edit}
    </div>
  );
}

/**
 * A share's header on the sky: its name, the page's heading, its ISIN,
 * exchange and currency, or a manual share's ISIN, badge and `edit`; then
 * the latest price with its change over the period and its time, or who
 * entered a manual share's last value and when.
 */
export function ShareHeader({
  share,
  lastValue,
  edit,
}: {
  share: ShareDetail;
  /** A manual share's newest value, once its values load. */
  lastValue: ShareValue | undefined;
  /** Edit name or ISIN, for a manual share and a viewer who may. */
  edit?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex",
        "flex-col gap-s",
        "tablet:flex-row tablet:items-start tablet:justify-between tablet:gap-l",
        "desktop:flex-row desktop:items-start desktop:justify-between desktop:gap-l",
      )}
    >
      <div className="grid min-w-0 gap-s">
        <h1
          className={cn(
            "font-semibold text-primary text-balance",
            "text-xl",
            "tablet:text-display",
            "desktop:text-display",
          )}
        >
          {share.name}
        </h1>
        <Facts share={share} edit={edit} />
      </div>
      <SharePrice share={share} lastValue={lastValue} />
    </div>
  );
}
