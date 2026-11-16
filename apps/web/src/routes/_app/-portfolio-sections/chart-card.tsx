// The chart card's parts, imported as a namespace: `import * as ChartCard from "…/chart-card"`.
import type { Portfolio } from "@fpr/contracts";
import { type ComponentProps, useId } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../../../components/atoms/card/card";
import { LoadingPlaceholder } from "../../../components/atoms/loading-placeholder/loading-placeholder";
import { AllocationBar } from "../../../components/molecules/allocation-bar/allocation-bar";
import {
  allocate,
  allocationHoldings,
} from "../../../components/molecules/allocation-bar/allocation-bar-model";
import { cn } from "../../../lib/cn";
import type { MemberColor } from "../../../lib/member-color";

/** The chart's height in the card. */
export const PLOT = cn(
  "",
  "h-[13rem]",
  "tablet:h-[15rem]",
  "desktop:h-[15rem]",
);

/** The first card on the ridge, a member's page's and Portfolio's: their chart, its key, then how their portfolio splits. */
export function Root({ className, ...props }: ComponentProps<"div">) {
  return (
    <Card
      {...props}
      elevation="rest"
      className={cn(
        "grid min-w-0 gap-m",
        "p-m",
        "tablet:p-l",
        "desktop:p-l",
        className,
      )}
    />
  );
}

/** The chart's place while its points load. */
export function Loading() {
  return <LoadingPlaceholder className={PLOT} />;
}

/** The row under the chart that names its lines and marks. */
export function Key({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      {...props}
      className={cn(
        "flex flex-wrap items-center gap-x-m gap-y-xs text-xs text-secondary",
        className,
      )}
    />
  );
}

/**
 * How the portfolio splits, in the member's colour, once it loads; with
 * `titled`, under a small “How it's split” title.
 */
export function Split({
  portfolio,
  color,
  titled = false,
}: {
  portfolio: Portfolio | undefined;
  color: MemberColor;
  titled?: boolean;
}) {
  const { t } = useTranslation();
  const titleId = useId();

  if (portfolio === undefined) return null;
  const holdings = allocationHoldings(portfolio.holdings);
  if (allocate(holdings, portfolio.cashWeight).length === 0) return null;
  const bar = (
    <AllocationBar
      color={color}
      holdings={holdings}
      cashWeight={portfolio.cashWeight}
    />
  );
  return titled ? (
    <section
      aria-labelledby={titleId}
      className="grid gap-s border-t-[1.5px] border-divider pt-m"
    >
      <h2 id={titleId} className="text-xs text-secondary">
        {t("allocationBar.label")}
      </h2>
      {bar}
    </section>
  ) : (
    bar
  );
}
