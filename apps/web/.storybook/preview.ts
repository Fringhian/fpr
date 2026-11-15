import {
  Controls,
  Description,
  Primary,
  Stories,
  Subtitle,
  Title,
} from "@storybook/addon-docs/blocks";
import type { Preview } from "@storybook/react-vite";
import { createElement, Fragment } from "react";
import "../src/index.css";

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
  initialGlobals: { backgrounds: { value: "page" } },
};

export default preview;
