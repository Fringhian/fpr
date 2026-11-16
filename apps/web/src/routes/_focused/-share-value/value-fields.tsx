import type { IsoDate } from "@fpr/contracts";
import { ClockIcon } from "@phosphor-icons/react/Clock";
import { useTranslation } from "react-i18next";
import { DayField } from "../../../components/molecules/day-field/day-field";
import * as Field from "../../../components/molecules/field/field";
import { PriceField } from "../../-share-fields/share-fields";
import { isFuture, momentOf, type ValueDraft } from "./value-draft";

/**
 * Add a value's fields: the day and the time of day beside it, a moment
 * that hasn't come yet refused, then the value of one unit. Editing a value
 * keeps its moment, so `moment` alone leaves the value field.
 */
export function ValueFields({
  draft,
  onChange,
  today,
  moment,
}: {
  draft: ValueDraft;
  onChange: (patch: Partial<ValueDraft>) => void;
  today: IsoDate;
  /** Shows the value field alone, for a value whose moment is fixed. */
  moment: boolean;
}) {
  const { t } = useTranslation();

  const price = (
    <PriceField
      value={draft.price}
      onValueChange={(text) => onChange({ price: text })}
    />
  );
  return moment ? (
    price
  ) : (
    <div className="grid gap-m">
      <div className="grid grid-cols-2 items-start gap-m">
        <DayField
          label={t("valueForm.day")}
          value={draft.day}
          onValueChange={(day) => onChange({ day })}
          max={today}
          today={today}
        />
        <Field.Basic
          name="time"
          label={t("valueForm.time")}
          type="time"
          icon={ClockIcon}
          check={(text) =>
            momentOf(draft.day, text) !== null && !isFuture(draft.day, text)
          }
          error={t("valueForm.future")}
          value={draft.time}
          onValueChange={(time) => onChange({ time })}
        />
      </div>
      {price}
    </div>
  );
}
