import type { Language } from "@fpr/contracts";
import { languages } from "@fpr/contracts/values";
import { useTranslation } from "react-i18next";
import * as Segment from "../../atoms/segment/segment";

export type LanguageSwitchProps = {
  /** The language FPR shows. */
  value: Language;
  /** Called with the language picked. */
  onValueChange: (language: Language) => void;
} & Omit<
  Segment.RootProps<Language>,
  "value" | "defaultValue" | "onValueChange" | "backdrop"
>;

/**
 * FR and EN as a segment on snow, for the steps before sign-in and
 * onboarding. Each option is marked as written in its own language.
 */
export function LanguageSwitch({
  value,
  onValueChange,
  ...props
}: LanguageSwitchProps) {
  const { t } = useTranslation();

  return (
    <Segment.Root<Language>
      aria-label={t("languageSwitch.label")}
      {...props}
      backdrop="snow"
      value={value}
      onValueChange={onValueChange}
    >
      {languages.map((language) => (
        <Segment.Item key={language} value={language} lang={language}>
          {language.toUpperCase()}
        </Segment.Item>
      ))}
    </Segment.Root>
  );
}
