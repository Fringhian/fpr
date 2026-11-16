import type { Language, PortfolioBalanceHistory } from "@fpr/contracts";
import type { TFunction } from "i18next";
import type {
  ChartLine,
  ChartMark,
} from "../../../components/molecules/chart/chart";
import { changeSummaryOf, entryTitle } from "../../../lib/log-entry";
import type { MemberColor } from "../../../lib/member-color";
import { raceDayOf } from "../../../lib/race-day";
import { balancePoints, lastCloseOf } from "../../../lib/series";

/** Each share change of the period as a mark: up for a purchase, down for a sale. Cash balances have none. */
function changeMarks(
  entries: PortfolioBalanceHistory["entries"],
  t: TFunction,
  language: Language,
): ChartMark[] {
  return entries.flatMap((entry): ChartMark[] => {
    if (entry.type === "cash") return [];
    const change = changeSummaryOf(entry);
    return [
      {
        day: raceDayOf(entry.effectiveAt),
        direction: change.kind === "sold" ? "down" : "up",
        label: entryTitle(change, t, language),
      },
    ];
  });
}

/** The viewer's balance over the period in their colour, today dashed, each purchase and sale marked. */
export function balanceLine(
  history: PortfolioBalanceHistory,
  color: MemberColor,
  t: TFunction,
  language: Language,
): ChartLine {
  const dashedAfter = lastCloseOf(history.points);
  return {
    id: "balance",
    label: t("portfolioPage.balance"),
    color,
    points: balancePoints(history.points),
    marks: changeMarks(history.entries, t, language),
    ...(dashedAfter === undefined ? {} : { dashedAfter }),
  };
}
