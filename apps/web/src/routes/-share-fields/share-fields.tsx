import { CurrencyEurIcon } from "@phosphor-icons/react/CurrencyEur";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { TextLink } from "../../components/atoms/text-link/text-link";
import * as Field from "../../components/molecules/field/field";
import { priceIn } from "../../lib/amount";
import { useLanguage } from "../../lib/i18n";
import { isinIn } from "../../lib/isin";

type TextProps = { value: string; onValueChange: (text: string) => void };

/**
 * A manual share's ISIN, typed in capitals, refused unless it is one. An
 * ISIN another share has shows `takenLink`, to that share, under it.
 */
export function IsinField({
  value,
  onValueChange,
  takenLink,
}: TextProps & { takenLink: ReactElement | null }) {
  const { t } = useTranslation();

  return (
    <Field.Basic
      name="isin"
      label={t("newShare.isin.label")}
      check={(text) => isinIn(text) !== null}
      error={t("newShare.isin.invalid")}
      spellCheck={false}
      autoCapitalize="characters"
      value={value}
      onValueChange={(isin) => onValueChange(isin.toUpperCase())}
    >
      {takenLink ? (
        <TextLink render={takenLink} toPage className="mt-xs w-fit text-s">
          {t("newShare.openTaken")}
        </TextLink>
      ) : null}
    </Field.Basic>
  );
}

/** A manual share's name, refused when empty. */
export function NameField({ value, onValueChange }: TextProps) {
  const { t } = useTranslation();

  return (
    <Field.Basic
      name="name"
      label={t("newShare.name.label")}
      check={(text) => text.trim() !== ""}
      error={t("newShare.name.missing")}
      maxLength={100}
      placeholder={t("newShare.name.placeholder")}
      value={value}
      onValueChange={onValueChange}
    />
  );
}

/** The value of one unit in euros, read in the reader's language, refused unless above zero. */
export function PriceField({ value, onValueChange }: TextProps) {
  const { t } = useTranslation();
  const language = useLanguage();

  return (
    <Field.Basic
      name="price"
      label={t("newShare.price.label")}
      check={(text) => priceIn(text, language) !== null}
      error={t("newShare.price.invalid")}
      decimal
      icon={CurrencyEurIcon}
      value={value}
      onValueChange={onValueChange}
    />
  );
}
