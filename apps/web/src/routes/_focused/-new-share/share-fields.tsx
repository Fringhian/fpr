import type { IsoDate } from "@fpr/contracts";
import { CurrencyEurIcon } from "@phosphor-icons/react/CurrencyEur";
import type { ReactElement, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { TextLink } from "../../../components/atoms/text-link/text-link";
import { DayField } from "../../../components/molecules/day-field/day-field";
import * as Field from "../../../components/molecules/field/field";
import { useLanguage } from "../../../lib/i18n";
import { isinIn } from "../../../lib/isin";
import { priceOf, type ShareDraft } from "./draft";

/** One text field: its label, the control, its error, then `children`. It is valid when `ok` holds for the text, and says `error` otherwise. */
function TextField({
  name,
  label,
  ok,
  error,
  children,
  ...control
}: {
  name: string;
  label: string;
  ok: (text: string) => boolean;
  error: string;
  children?: ReactNode;
} & Field.ControlProps) {
  return (
    <Field.Root
      name={name}
      validate={(value) =>
        typeof value === "string" && ok(value) ? null : error
      }
    >
      <Field.Label>{label}</Field.Label>
      <Field.Control autoComplete="off" {...control} />
      <Field.Error />
      {children}
    </Field.Root>
  );
}

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

  return (
    <div className="grid gap-m">
      <TextField
        name="isin"
        label={t("newShare.isin.label")}
        ok={(text) => isinIn(text) !== null}
        error={t("newShare.isin.invalid")}
        spellCheck={false}
        autoCapitalize="characters"
        value={draft.isin}
        onValueChange={(isin) => onChange({ isin: isin.toUpperCase() })}
      >
        {takenLink ? (
          <TextLink render={takenLink} toPage className="mt-xs w-fit text-s">
            {t("newShare.openTaken")}
          </TextLink>
        ) : null}
      </TextField>
      <TextField
        name="name"
        label={t("newShare.name.label")}
        ok={(text) => text.trim() !== ""}
        error={t("newShare.name.missing")}
        maxLength={100}
        placeholder={t("newShare.name.placeholder")}
        value={draft.name}
        onValueChange={(name) => onChange({ name })}
      />
      <div className="grid grid-cols-2 items-start gap-m">
        <TextField
          name="price"
          label={t("newShare.price.label")}
          ok={(text) => priceOf(text, language) !== null}
          error={t("newShare.price.invalid")}
          decimal
          icon={CurrencyEurIcon}
          value={draft.price}
          onValueChange={(price) => onChange({ price })}
        />
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
