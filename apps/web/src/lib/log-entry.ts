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

/**
 * What a log entry records for an anonymous viewer, who reads no quantity or
 * cash: its weight in the holder's balance at its moment, in percent, signed
 * like a change. An entry with no weight then, without a price or with a
 * zero balance, has `null`: a change of unknown weight is neither bought nor
 * sold, but `traded`.
 */
export type WeighedSummary =
  | { kind: "bought" | "sold"; share: string; weight: Decimal }
  | { kind: "traded"; share: string; weight: null }
  | { kind: "cashSet"; weight: Decimal | null };

type Direction = { sold: boolean; size: Decimal };

/**
 * A signed quantity or weight as its direction and its size above zero, or
 * `null` for `null`. For an anonymous viewer the API replaces every quantity
 * and cash field of an entry with the entry's weight, `null` when it has
 * none, though the contract types the field as the decimal a member reads.
 */
export function directionOf(signed: Decimal | null): Direction | null {
  return signed === null ? null : split(signed);
}

function split(signed: Decimal): Direction {
  const sold = signed.startsWith("-");
  return { sold, size: sold ? signed.slice(1) : signed };
}

/** A share change for a viewer who reads quantities; an anonymous viewer's reads as `weighedSummaryOf`. */
export function changeSummaryOf(change: PortfolioChange): ChangeSummary {
  const { sold, size } = split(change.quantityDelta);
  return {
    kind: sold ? "sold" : "bought",
    share: change.share.name,
    quantity: size,
  };
}

export function entrySummaryOf(entry: SavedEntry): EntrySummary {
  return entry.type === "cash"
    ? { kind: "cashSet", amount: entry.amountEur }
    : changeSummaryOf(entry);
}

export function weighedSummaryOf(entry: SavedEntry): WeighedSummary {
  if (entry.type === "cash") {
    return { kind: "cashSet", weight: entry.amountEur };
  }
  const share = entry.share.name;
  const direction = directionOf(entry.quantityDelta);
  return direction === null
    ? { kind: "traded", share, weight: null }
    : {
        kind: direction.sold ? "sold" : "bought",
        share,
        weight: entry.quantityDelta,
      };
}

/**
 * The entry's title, as History writes it: “Bought 10 World Index ETF”,
 * “Cash set to €2,000”, or for an anonymous viewer without its quantity or
 * cash, “Bought World Index ETF”, “Cash set”.
 */
export function entryTitle(
  entry: EntrySummary | WeighedSummary,
  t: TFunction,
  language: Language,
): string {
  if ("weight" in entry) {
    return entry.kind === "cashSet"
      ? t("timelineRow.weighed.cashSet")
      : t(`timelineRow.weighed.${entry.kind}`, { share: entry.share });
  }
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
