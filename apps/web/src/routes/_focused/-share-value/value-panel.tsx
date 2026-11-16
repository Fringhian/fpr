import type { IsoDate, ShareValue } from "@fpr/contracts";
import { useTranslation } from "react-i18next";
import { ChangeSummary } from "../../../components/molecules/change-summary/change-summary";
import { priceIn } from "../../../lib/amount";
import { useDayText } from "../../../lib/day-text";
import { formatDate, formatTime } from "../../../lib/format/date";
import { formatMoney } from "../../../lib/format/money";
import { useLanguage } from "../../../lib/i18n";
import { RACE_TIME_ZONE } from "../../../lib/race-day";
import { momentOf, type ValueDraft } from "./value-draft";

const timeZone = RACE_TIME_ZONE;

/**
 * The sky panel's card: the share, the value's day and time, or the moment
 * of the value edited and the value it had, then the value typed, a dash
 * while it isn't one.
 */
export function ValuePanel({
  shareName,
  draft,
  today,
  editing,
}: {
  shareName: string;
  draft: ValueDraft;
  today: IsoDate;
  editing: ShareValue | undefined;
}) {
  const { t } = useTranslation();
  const language = useLanguage();
  const dayText = useDayText(today);

  const price = priceIn(draft.price, language);
  const moment = editing
    ? [
        {
          term: t("valueForm.day"),
          value: formatDate(editing.at, language, { timeZone, style: "long" }),
        },
        {
          term: t("valueForm.time"),
          value: formatTime(editing.at, language, { timeZone }),
        },
        {
          term: t("valueForm.before"),
          value: formatMoney(editing.priceEur, language),
        },
      ]
    : [
        { term: t("valueForm.day"), value: dayText(draft.day) },
        {
          term: t("valueForm.time"),
          value: momentOf(draft.day, draft.time) ? draft.time : null,
        },
      ];
  const rows = [
    { term: t("valueForm.share"), value: shareName },
    ...moment,
    {
      term: t("shareFields.price.label"),
      value: price === null ? null : formatMoney(price, language),
    },
  ];
  return <ChangeSummary title={t("valueForm.summary")} rows={rows} />;
}
