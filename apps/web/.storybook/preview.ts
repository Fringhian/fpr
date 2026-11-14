import type { Preview } from "@storybook/react-vite";
import "../src/index.css";

const preview: Preview = {
  parameters: {
    options: {
      storySort: {
        order: [
          "Foundations",
          ["Colour", "Typography", "Spacing", "Shape", "Breakpoints", "Icons"],
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
