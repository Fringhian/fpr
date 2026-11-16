import { fileURLToPath } from "node:url";
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin";
import { playwright } from "@vitest/browser-playwright";
import { defineConfig, mergeConfig } from "vitest/config";
import viteConfig from "./vite.config.ts";

// Runs every story in Chromium, with its accessibility checks.
export default mergeConfig(
  viteConfig,
  defineConfig({
    plugins: [
      storybookTest({
        configDir: fileURLToPath(new URL("./.storybook", import.meta.url)),
      }),
    ],
    // Every dependency is bundled before the first story runs: one the
    // optimizer found mid-run would reload the browser and fail the run.
    // The scan starts from the stories and the app's own entry, which the
    // test server serves too; `include` pins the libraries the components
    // build on.
    optimizeDeps: {
      entries: ["index.html"],
      include: [
        "@base-ui/react/avatar",
        "@base-ui/react/button",
        "@base-ui/react/collapsible",
        "@base-ui/react/dialog",
        "@base-ui/react/field",
        "@base-ui/react/input",
        "@base-ui/react/menu",
        "@base-ui/react/popover",
        "@base-ui/react/progress",
        "@base-ui/react/radio",
        "@base-ui/react/radio-group",
        "@base-ui/react/toggle",
        "@base-ui/react/toggle-group",
        "@base-ui/react/use-render",
        "@orpc/client",
        "@orpc/openapi-client/fetch",
        "@orpc/openapi/fetch",
        "@orpc/server",
        "@orpc/tanstack-query",
        "@tanstack/react-query",
        "@tanstack/react-router",
        "big.js",
        "class-variance-authority",
        "clsx",
        "i18next",
        "msw",
        "msw/browser",
        "msw-storybook-addon/csf3",
        "react-i18next",
        "tailwind-merge",
        "zod",
      ],
    },
    test: {
      name: "storybook",
      browser: {
        enabled: true,
        headless: true,
        provider: playwright(),
        instances: [{ browser: "chromium" }],
      },
    },
  }),
);
