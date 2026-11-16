import type { IsoDate } from "@fpr/contracts";
import { CurrencyEurIcon } from "@phosphor-icons/react/CurrencyEur";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { TextLink } from "../../../components/atoms/text-link/text-link";
import { DayField } from "../../../components/molecules/day-field/day-field";
import * as Field from "../../../components/molecules/field/field";
import { useLanguage } from "../../../lib/i18n";
import { isinIn } from "../../../lib/isin";
import { priceOf, type ShareDraft } from "./draft";

/**
 * Create a manual share's fields: the ISIN, the name, then the value of one
 * unit beside its day. Each checks itself as it is submitted; the API's
 * refusal of the ISIN shows under it, with `takenLink` to the share that has
 * it.
 */
export function ShareFields({
  draft,
  onChange,
  today,
  takenLink,
}: {
  draft: ShareDraft;
  onChange: (patch: Partial<ShareDraft>) => void;
  today: IsoDate;
  takenLink: ReactElement | null;
}) {
  const { t } = useTranslation();
  const language = useLanguage();

  const check =
    (ok: (text: string) => boolean, error: string) => (value: unknown) =>
      typeof value === "string" && ok(value) ? null : error;
  const price = (text: string) => priceOf(text, language) !== null;

  return (
    <div className="grid gap-m">
      <Field.Root
        name="isin"
        validate={check(
          (text) => isinIn(text) !== null,
          t("newShare.isin.invalid"),
        )}
      >
        <Field.Label>{t("newShare.isin.label")}</Field.Label>
        <Field.Control
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="characters"
          value={draft.isin}
          onValueChange={(isin) => onChange({ isin: isin.toUpperCase() })}
        />
        <Field.Error />
        {takenLink ? (
          <TextLink render={takenLink} toPage className="mt-xs w-fit text-s">
            {t("newShare.openTaken")}
          </TextLink>
        ) : null}
      </Field.Root>
      <Field.Root
        name="name"
        validate={check(
          (text) => text.trim() !== "",
          t("newShare.name.missing"),
        )}
      >
        <Field.Label>{t("newShare.name.label")}</Field.Label>
        <Field.Control
          autoComplete="off"
          maxLength={100}
          placeholder={t("newShare.name.placeholder")}
          value={draft.name}
          onValueChange={(name) => onChange({ name })}
        />
        <Field.Error />
      </Field.Root>
      <div className="grid grid-cols-2 items-start gap-m">
        <Field.Root
          name="price"
          validate={check(price, t("newShare.price.invalid"))}
        >
          <Field.Label>{t("newShare.price.label")}</Field.Label>
          <Field.Control
            decimal
            autoComplete="off"
            icon={CurrencyEurIcon}
            value={draft.price}
            onValueChange={(text) => onChange({ price: text })}
          />
          <Field.Error />
        </Field.Root>
        <DayField
          label={t("newShare.day")}
          value={draft.day}
          onValueChange={(day) => onChange({ day })}
          max={today}
          today={today}
        />
      </div>
    </div>
  );
}
