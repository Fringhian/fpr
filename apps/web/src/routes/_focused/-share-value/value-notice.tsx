import type { Id, ShareValue } from "@fpr/contracts";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { TextLink } from "../../../components/atoms/text-link/text-link";
import type { ValueConflict } from "../../../lib/api/errors";
import { formatDate, formatTime } from "../../../lib/format/date";
import { formatMoney } from "../../../lib/format/money";
import { useLanguage } from "../../../lib/i18n";
import { raceTimeZone } from "../../../lib/race-day";

/**
 * Why the value isn't saved yet, in a polite live region: someone changed
 * the value being edited, `changed`, which saving again overwrites, or the
 * moment has a value already, `taken`, with a link to edit it instead.
 */
export function ValueNotice({
  shareId,
  changed,
  taken,
}: {
  shareId: Id;
  /** The price the value being edited has now, and who entered it. */
  changed: ValueConflict | null;
  /** The value already at the moment typed. */
  taken: ShareValue | null;
}) {
  const { t } = useTranslation();
  const language = useLanguage();

  const timeZone = raceTimeZone();
  return (
    <div role="status">
      {changed !== null ? (
        <p className="rounded-m bg-warning-soft p-m text-s text-warning">
          {changed.changedBy === null
            ? t("valueForm.changed", {
                price: formatMoney(changed.priceEur, language),
              })
            : t("valueForm.changedBy", {
                name: changed.changedBy.displayName,
                price: formatMoney(changed.priceEur, language),
              })}
        </p>
      ) : taken !== null ? (
        <p className="grid gap-xs rounded-m bg-warning-soft p-m text-s text-warning">
          {t("valueForm.taken", {
            price: formatMoney(taken.priceEur, language),
            date: formatDate(taken.at, language, { timeZone }),
            time: formatTime(taken.at, language, { timeZone }),
          })}
          <TextLink
            toPage
            className="w-fit"
            render={
              <Link
                to="/shares/$shareId/value"
                params={{ shareId }}
                search={{ at: taken.at }}
              />
            }
          >
            {t("valueForm.editTaken")}
          </TextLink>
        </p>
      ) : null}
    </div>
  );
}
