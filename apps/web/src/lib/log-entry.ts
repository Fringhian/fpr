import type {
  Decimal,
  Language,
  PortfolioCashBalance,
  PortfolioChange,
} from "@fpr/contracts";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import { formatMoney } from "./format/money";
import { formatQuantity } from "./format/number";
import { useLanguage } from "./i18n";

/**
 * A share change or cash balance as a write answers it. A row of the log is
 * one too, with the log's running figures beside it.
 */
export type SavedEntry = PortfolioChange | PortfolioCashBalance;

/** What a share change records: shares bought or sold, the units above zero. */
export type ChangeSummary = {
  kind: "bought" | "sold";
  share: string;
  quantity: Decimal;
};

/** What a log entry records, as its title says it. */
export type EntrySummary = ChangeSummary | { kind: "cashSet"; amount: Decimal };

export function changeSummaryOf(change: PortfolioChange): ChangeSummary {
  const sold = change.quantityDelta.startsWith("-");
  return {
    kind: sold ? "sold" : "bought",
    share: change.share.name,
    quantity: sold ? change.quantityDelta.slice(1) : change.quantityDelta,
  };
}

export function entrySummaryOf(entry: SavedEntry): EntrySummary {
  return entry.type === "cash"
    ? { kind: "cashSet", amount: entry.amountEur }
    : changeSummaryOf(entry);
}

/** The entry's title, as History writes it: “Bought 10 World Index ETF”, “Cash set to €2,000”. */
export function entryTitle(
  entry: EntrySummary,
  t: TFunction,
  language: Language,
): string {
  return entry.kind === "cashSet"
    ? t("timelineRow.cashSet", { amount: formatMoney(entry.amount, language) })
    : t(`timelineRow.${entry.kind}`, {
        quantity: formatQuantity(entry.quantity, language),
        share: entry.share,
      });
}

/** `entryTitle` of a log entry, in the reader's language. */
export function useEntryTitle(): (entry: SavedEntry) => string {
  const { t } = useTranslation();
  const language = useLanguage();

  return (entry) => entryTitle(entrySummaryOf(entry), t, language);
}
