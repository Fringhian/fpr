import type { LatestPrice } from "@fpr/contracts";
import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import { formatDate, formatTime } from "./format/date";
import { useLanguage } from "./i18n";

/**
 * When a latest price is from, as every price shows it: “as of 14:30” for a
 * refresh, “close of 5 Mar” for a close, “as of 3 Mar” for a manual value.
 * `timeZone` is the one a time and a day are read in, the browser's by
 * default.
 */
export function usePriceTime(): (
  latestPrice: Pick<LatestPrice, "at" | "source">,
  timeZone?: string,
) => string {
  const { t } = useTranslation();
  const language = useLanguage();

  return useCallback(
    ({ at, source }, timeZone) =>
      source === "intraday"
        ? t("priceTime.asOfTime", {
            time: formatTime(at, language, { timeZone }),
          })
        : t(source === "manual" ? "priceTime.asOfDate" : "priceTime.closeOf", {
            date: formatDate(at, language, { timeZone }),
          }),
    [t, language],
  );
}
