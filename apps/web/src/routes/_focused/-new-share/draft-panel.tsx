import type { IsoDate } from "@fpr/contracts";
import { useTranslation } from "react-i18next";
import { ChangeSummary } from "../../../components/molecules/change-summary/change-summary";
import { useDayText } from "../../../lib/day-text";
import { formatMoney } from "../../../lib/format/money";
import { useLanguage } from "../../../lib/i18n";
import { isinIn } from "../../../lib/isin";
import { priceOf, type ShareDraft } from "./draft";

/** The sky panel's card: the share as typed so far, a dash for each field still to fill. */
export function DraftPanel({
  draft,
  today,
}: {
  draft: ShareDraft;
  today: IsoDate;
}) {
  const { t } = useTranslation();
  const language = useLanguage();
  const dayText = useDayText(today);

  const price = priceOf(draft.price, language);
  const rows = [
    { term: t("newShare.isin.label"), value: isinIn(draft.isin) },
    { term: t("newShare.name.label"), value: draft.name.trim() || null },
    {
      term: t("newShare.price.label"),
      value: price === null ? null : formatMoney(price, language),
    },
    { term: t("newShare.day"), value: dayText(draft.day) },
  ];
  return <ChangeSummary title={t("newShare.summary")} rows={rows} />;
}
