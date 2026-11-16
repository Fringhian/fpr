import { useId, useState } from "react";
import { useTranslation } from "react-i18next";
import * as Field from "../../components/molecules/field/field";
import { FormError } from "../../components/molecules/form-error/form-error";
import { LanguageSwitch } from "../../components/molecules/language-switch/language-switch";
import { useErrorText } from "../../lib/api/errors";
import { useLanguage } from "../../lib/i18n";
import { useChangeLanguage } from "../../lib/language-choice";
import { useSession } from "../../lib/session/use-session";

/**
 * French or English, applied at once. A person with a profile keeps it on
 * their account, and a refused save puts the previous one back with why; an
 * anonymous viewer's stays on the device.
 */
export function LanguageSetting() {
  const { t } = useTranslation();
  const language = useLanguage();
  const changeLanguage = useChangeLanguage();
  const errorText = useErrorText();
  const { readOnly } = useSession();
  const labelId = useId();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col">
      <Field.GroupLabel id={labelId}>{t("settings.language")}</Field.GroupLabel>
      <LanguageSwitch
        named
        aria-labelledby={labelId}
        value={language}
        onValueChange={(picked) => {
          setError(null);
          changeLanguage(picked).catch((failure: unknown) =>
            setError(errorText(failure)),
          );
        }}
        className="self-start"
      />
      {readOnly ? (
        <p className="mt-[0.375rem] text-xs text-secondary">
          {t("settings.languageKept")}
        </p>
      ) : null}
      <FormError className="mt-s">{error}</FormError>
    </div>
  );
}
