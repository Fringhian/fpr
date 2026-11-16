import type { PortfolioLogEntry } from "@fpr/contracts";
import { useTranslation } from "react-i18next";
import { Badge } from "../../../components/atoms/badge/badge";
import { Button } from "../../../components/atoms/button/button";
import { UndoList } from "../../../components/molecules/undo-list/undo-list";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { formatDate } from "../../../lib/format/date";
import { formatMoney } from "../../../lib/format/money";
import { formatQuantity } from "../../../lib/format/number";
import { useLanguage } from "../../../lib/i18n";
import { RACE_TIME_ZONE } from "../../../lib/race-day";
import { useFlow } from "./flow";
import { PortfolioNow } from "./portfolio-now";
import { RecordPage } from "./record-page";

/** An entry's title, as History writes it: “Bought 10 World Index ETF”. */
function useEntryTitle(): (entry: PortfolioLogEntry) => string {
  const { t } = useTranslation();
  const language = useLanguage();

  return (entry) =>
    entry.type === "cash"
      ? t("timelineRow.cashSet", {
          amount: formatMoney(entry.amountEur, language),
        })
      : t(
          `timelineRow.${entry.quantityDelta.startsWith("-") ? "sold" : "bought"}`,
          {
            quantity: formatQuantity(
              entry.quantityDelta.replace(/^-/, ""),
              language,
            ),
            share: entry.share.name,
          },
        );
}

/**
 * Saved: the change just saved, then every change of this sitting with
 * Undo, then Record another change, which keeps the day, or Done.
 */
export function SavedStep() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { session, recordAnother, close } = useFlow();
  const title = useEntryTitle();

  const day = (entry: PortfolioLogEntry, style: "short" | "long") =>
    formatDate(entry.effectiveAt, language, {
      style,
      timeZone: RACE_TIME_ZONE,
    });
  const last = session.last;
  if (last === undefined) return null;
  return (
    <RecordPage panel={<PortfolioNow />}>
      <StepFlow.Body>
        <Badge state="saved" className="self-start" />
        <StepFlow.Question>
          {t("recordChange.saved.question", {
            change: title(last.entry),
            date: day(last.entry, "long"),
          })}
        </StepFlow.Question>
        <UndoList
          title={t("recordChange.saved.session")}
          items={session.items.map((item) => ({
            id: item.entry.id,
            label: `${title(item.entry)} · ${day(item.entry, "short")}`,
            undone: item.undone,
            busy: item.busy,
          }))}
          onUndo={(id) => {
            const item = session.items.find(({ entry }) => entry.id === id);
            if (item) void session.undo(item);
          }}
        />
      </StepFlow.Body>
      <StepFlow.Actions>
        <StepFlow.MainButton onClick={recordAnother}>
          {t("recordChange.saved.another")}
        </StepFlow.MainButton>
        <Button
          intent="secondary"
          size="step"
          nativeButton={false}
          render={close}
        >
          {t("recordChange.saved.done")}
        </Button>
      </StepFlow.Actions>
    </RecordPage>
  );
}
