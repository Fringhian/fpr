import { useTranslation } from "react-i18next";
import * as Field from "../../../../components/molecules/field/field";
import { raceToday } from "../../../../lib/race-day";
import { typedPrice } from "./shares-model";

/**
 * The first value of a share with no price: the value of one unit, named
 * `priceEur`, and its race day, named `on`, today by default and never later.
 */
export function FirstValueFields() {
  const { t } = useTranslation();

  const today = raceToday();

  const checkPrice = (value: unknown) =>
    typeof value === "string" && typedPrice(value) !== null
      ? null
      : t("adminShares.makeManual.priceInvalid");
  const checkDay = (value: unknown) =>
    typeof value === "string" && value !== "" && value <= today
      ? null
      : t("adminShares.makeManual.dayInvalid");

  return (
    <div className="grid grid-cols-2 items-start gap-m">
      <Field.Root name="priceEur" validate={checkPrice}>
        <Field.Label>{t("adminShares.makeManual.price")}</Field.Label>
        <Field.Control decimal autoComplete="off" end="€" />
        <Field.Error />
      </Field.Root>
      <Field.Root name="on" validate={checkDay}>
        <Field.Label>{t("adminShares.makeManual.day")}</Field.Label>
        <Field.Control type="date" defaultValue={today} max={today} />
        <Field.Error />
      </Field.Root>
    </div>
  );
}
