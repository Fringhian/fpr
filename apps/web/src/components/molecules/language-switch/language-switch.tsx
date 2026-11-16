import type { Language } from "@fpr/contracts";
import { languages } from "@fpr/contracts/values";
import { useTranslation } from "react-i18next";
import * as Segment from "../../atoms/segment/segment";

export type LanguageSwitchProps = {
  /** The language FPR shows. */
  value: Language;
  /** Called with the language picked. */
  onValueChange: (language: Language) => void;
  /** Names each language in full, “Français” and “English”, where there is room, as in Settings. FR and EN by default. */
  named?: boolean | undefined;
} & Omit<
  Segment.RootProps<Language>,
  "value" | "defaultValue" | "onValueChange" | "backdrop" | "named"
>;

/**
 * FR and EN as a segment on snow, for the steps before sign-in and
 * onboarding, or the languages' names in Settings. Each option is marked as
 * written in its own language.
 */
export function LanguageSwitch({
  value,
  onValueChange,
  named = false,
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
          {named ? t(`controls.language.${language}`) : language.toUpperCase()}
        </Segment.Item>
      ))}
    </Segment.Root>
  );
}
