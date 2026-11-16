import { useState } from "react";
import { useTranslation } from "react-i18next";
import * as Field from "../../../../components/molecules/field/field";
import { useRaceToday } from "../../../../lib/use-race-today";
import { PriceField } from "../../../-share-fields/share-fields";

/**
 * The first value of a share with no price: the value of one unit, named
 * `price`, and its race day, named `on`, today by default and never later.
 * The day is the browser's date control, not the calendar popover, which
 * opens a sheet on phone and a dialog never opens another.
 */
export function FirstValueFields() {
  const { t } = useTranslation();
  const today = useRaceToday();
  const [price, setPrice] = useState("");

  const checkDay = (value: unknown) =>
    typeof value === "string" && value !== "" && value <= today
      ? null
      : t("shareFields.day.invalid");

  return (
    <div className="grid grid-cols-2 items-start gap-m">
      <PriceField value={price} onValueChange={setPrice} />
      <Field.Root name="on" validate={checkDay}>
        <Field.Label>{t("shareFields.day.label")}</Field.Label>
        <Field.Control type="date" defaultValue={today} max={today} />
        <Field.Error />
      </Field.Root>
    </div>
  );
}
