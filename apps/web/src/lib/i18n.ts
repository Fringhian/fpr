import { createInstance, type i18n as I18n } from "i18next";
import { useTranslation } from "react-i18next";
import en from "../locales/en.json";
import fr from "../locales/fr.json";
import { LANGUAGES, type Language, pickLanguage } from "./language";

/** Both languages ship with the app: the texts are small, and load at once. */
const resources = {
  en: { translation: en },
  fr: { translation: fr },
} as const satisfies Record<Language, { translation: typeof en }>;

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation";
    resources: { translation: typeof en };
  }
}

/** An i18next instance in the given language, ready to translate at once. */
export function createI18n(language: Language): I18n {
  const instance = createInstance();
  void instance.init({
    lng: language,
    supportedLngs: LANGUAGES,
    fallbackLng: "en",
    resources,
    initAsync: false,
    // React escapes every text it renders.
    interpolation: { escapeValue: false },
  });
  return instance;
}

/** Keeps the page's `lang` attribute on the instance's language. */
export function syncDocumentLanguage(instance: I18n): void {
  document.documentElement.lang = instance.language;
  instance.on("languageChanged", (language) => {
    document.documentElement.lang = language;
  });
}

/** The language the nearest `I18nextProvider` translates into. */
export function useLanguage(): Language {
  const { i18n } = useTranslation();
  return pickLanguage([i18n.resolvedLanguage ?? i18n.language]);
}
