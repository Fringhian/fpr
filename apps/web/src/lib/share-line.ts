import type { ShareQuote } from "@fpr/contracts";
import { useTranslation } from "react-i18next";
import { formatMoney } from "./format/money";
import { useLanguage } from "./i18n";

/** A share's line under its name: its symbol, or “Manual”, and its latest price. */
export function useShareLine(): (
  share: Pick<ShareQuote, "symbol" | "latestPrice">,
) => string {
  const { t } = useTranslation();
  const language = useLanguage();

  return (share) =>
    [
      share.symbol ?? t("badge.manual"),
      share.latestPrice === null
        ? t("badge.pricePending")
        : formatMoney(share.latestPrice.priceEur, language),
    ].join(" · ");
}
