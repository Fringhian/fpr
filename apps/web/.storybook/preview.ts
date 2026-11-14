import type { Preview } from "@storybook/react-vite";
import type { i18n as I18n } from "i18next";
import { createElement } from "react";
import { I18nextProvider } from "react-i18next";
import { createI18n } from "../src/lib/i18n";
import { type Language, pickLanguage } from "../src/lib/language";
import "../src/index.css";

// One instance per language, so switching never mutates one during a render.
const i18nByLanguage = {
  en: createI18n("en"),
  fr: createI18n("fr"),
} satisfies Record<Language, I18n>;

const preview: Preview = {
  globalTypes: {
    locale: {
      description: "The language stories are written in",
      toolbar: {
        title: "Language",
        icon: "globe",
        items: [
          { value: "en", title: "English" },
          { value: "fr", title: "Français" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { locale: "en" },
  decorators: [
    (Story, { globals }) => {
      const language = pickLanguage([String(globals.locale)]);
      document.documentElement.lang = language;
      return createElement(
        I18nextProvider,
        { i18n: i18nByLanguage[language] },
        createElement(Story),
      );
    },
  ],
  parameters: {
    options: {
      storySort: {
        order: [
          "Foundations",
          ["Colour", "Typography", "Spacing", "Shape", "Breakpoints"],
          "Atoms",
          "Molecules",
          "Organisms",
          "Templates",
        ],
      },
    },
    viewport: {
      options: {
        phone: {
          name: "Phone",
          styles: { width: "375px", height: "812px" },
          type: "mobile",
        },
        tablet: {
          name: "Tablet",
          styles: { width: "768px", height: "1024px" },
          type: "tablet",
        },
        desktop: {
          name: "Desktop",
          styles: { width: "1280px", height: "800px" },
          type: "desktop",
        },
      },
    },
    a11y: {
      // A violation fails the story's test, in the test panel and in CI.
      test: "error",
    },
  },
};

export default preview;
