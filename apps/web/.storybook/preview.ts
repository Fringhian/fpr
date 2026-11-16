import type { Language } from "@fpr/contracts";
import {
  Controls,
  Description,
  Primary,
  Stories,
  Subtitle,
  Title,
} from "@storybook/addon-docs/blocks";
import type { Preview } from "@storybook/react-vite";
import type { i18n as I18n } from "i18next";
import { mswLoader } from "msw-storybook-addon/csf3";
import { createElement, Fragment } from "react";
import { I18nextProvider } from "react-i18next";
import { createI18n } from "../src/lib/i18n";
import { pickLanguage } from "../src/lib/language";
import "../src/index.css";

// One instance per language, so switching never mutates one during a render.
const i18nByLanguage = {
  en: createI18n("en"),
  fr: createI18n("fr"),
} satisfies Record<Language, I18n>;

/**
 * Every Docs page: the description, the main story with its controls, then
 * the other stories, without repeating the main one.
 */
function DocsPage() {
  return createElement(
    Fragment,
    null,
    createElement(Title),
    createElement(Subtitle),
    createElement(Description),
    createElement(Primary),
    createElement(Controls),
    createElement(Stories, { includePrimary: false }),
  );
}

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
  initialGlobals: { locale: "en", backgrounds: { value: "page" } },
  // A story whose `parameters.msw` holds handlers, such as `mockApi()`'s,
  // runs on MSW's worker with them. The others never start it.
  loaders: [
    (context) =>
      context.parameters.msw === undefined ? {} : mswLoader()(context),
  ],
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
    docs: { page: DocsPage },
    options: {
      storySort: {
        order: [
          "Foundations",
          [
            "Colour",
            "Typography",
            "Spacing",
            "Shape",
            "Breakpoints",
            "Icons",
            "Sky and ridge",
          ],
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
        wide: {
          name: "Wide",
          styles: { width: "1600px", height: "900px" },
          type: "desktop",
        },
      },
    },
    // The canvas is the page ground, so a story shorter than the frame ends on
    // snow, in the canvas and on the Docs page alike.
    backgrounds: {
      options: { page: { name: "Page", value: "var(--palette-snow)" } },
    },
    a11y: {
      // A violation fails the story's test, in the test panel and in CI.
      test: "error",
    },
  },
};

export default preview;
