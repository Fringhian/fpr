import type { Decimal } from "@fpr/contracts";
import type { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { formatPercent } from "../../../lib/format/money";
import { useLanguage } from "../../../lib/i18n";
import { Chip } from "../../atoms/chip/chip";

/** A top holding: the share's name and its weight in percent of the balance. */
export interface StripHolding {
  id: string;
  name: string;
  weight: Decimal;
}

export type HoldingsProps = {
  /** Their largest holdings, largest first. */
  holdings: readonly StripHolding[];
  /** How many holdings they have in all: past the ones shown, “+2 more”. */
  count: number;
} & Omit<ComponentProps<"div">, "children">;

/**
 * The top holdings: chips with their weight on desktop, their names on one
 * line on phone. Tablet leaves them out.
 */
export function Holdings({
  holdings,
  count,
  className,
  ...props
}: HoldingsProps) {
  const { t } = useTranslation();
  const language = useLanguage();

  const more = count - holdings.length;

  return holdings.length === 0 ? null : (
    <div
      {...props}
      className={cn(
        "min-w-0 [grid-area:holdings]",
        "block",
        "tablet:hidden",
        "desktop:block",
        className,
      )}
    >
      <p
        className={cn(
          "truncate text-xs text-secondary",
          "block",
          "tablet:hidden",
          "desktop:hidden",
        )}
      >
        {holdings.map(({ name }) => name).join(" · ")}
      </p>
      <ul
        aria-label={t("memberStrip.topHoldings")}
        className={cn(
          "m-0 list-none flex-wrap items-center gap-xs p-0",
          "hidden",
          "tablet:hidden",
          "desktop:flex",
        )}
      >
        {holdings.map((holding) => (
          <li key={holding.id} className="min-w-0 max-w-full">
            <Chip className="max-w-full text-xs">
              <span className="truncate">{holding.name}</span>
              <span className="font-normal text-secondary tabular-nums">
                {formatPercent(holding.weight, language)}
              </span>
            </Chip>
          </li>
        ))}
        {more > 0 ? (
          <li className="text-xs text-secondary">
            {t("memberStrip.more", { count: more })}
          </li>
        ) : null}
      </ul>
    </div>
  );
}
