import type { IsoDate } from "@fpr/contracts";
import { useTranslation } from "react-i18next";
import { formatDate } from "./format/date";
import { useLanguage } from "./i18n";

/** A day picked in a form, written out: “Today” when it is `today`, else “3 March 2026”. */
export function useDayText(
  today: IsoDate | undefined,
): (day: IsoDate) => string {
  const { t } = useTranslation();
  const language = useLanguage();

  return (day) =>
    day === today
      ? t("dayField.today")
      : formatDate(day, language, { style: "long" });
}
