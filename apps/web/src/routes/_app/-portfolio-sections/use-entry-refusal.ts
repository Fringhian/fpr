import type { PortfolioChange } from "@fpr/contracts";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../components/molecules/toast/use-toast";
import { isApiError, useErrorText } from "../../../lib/api/errors";
import { formatDate } from "../../../lib/format/date";
import { quote } from "../../../lib/format/text";
import { useLanguage } from "../../../lib/i18n";
import { useEntryTitle } from "../../../lib/log-entry";
import { RACE_TIME_ZONE } from "../../../lib/race-day";

/** The stored change a `holding_below_zero` refusal names, from its details. */
function brokenChange(error: unknown): PortfolioChange | null {
  if (!isApiError(error, "holding_below_zero")) return null;
  const details: unknown = error.data;
  if (typeof details !== "object" || details === null) return null;
  const change: unknown = "change" in details ? details.change : null;
  return typeof change === "object" &&
    change !== null &&
    "share" in change &&
    "quantityDelta" in change &&
    "effectiveAt" in change
    ? (change as PortfolioChange)
    : null;
}

/**
 * Why a write to a log entry was refused, written out. A refusal for a
 * holding going below zero names the change it would break and its day:
 * “Sold 5 Swiss Pharma AG” on 24 Feb.
 */
export function useEntryRefusalText(): (error: unknown) => string {
  const { t } = useTranslation();
  const language = useLanguage();
  const errorText = useErrorText();
  const title = useEntryTitle();

  return (error) => {
    const change = brokenChange(error);
    return change === null
      ? errorText(error)
      : t("entryActions.breaks", {
          change: quote(title(change), language),
          date: formatDate(change.effectiveAt, language, {
            timeZone: RACE_TIME_ZONE,
          }),
        });
  };
}

/** Shows why a write to a log entry was refused, in a toast that stays until dismissed. */
export function useEntryRefusal() {
  const toast = useToast();
  const refusalText = useEntryRefusalText();

  return (title: string, error: unknown) => {
    toast.show({ title, description: refusalText(error), timeout: 0 });
  };
}
