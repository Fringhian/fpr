import type { StorybookConfig } from "@storybook/react-vite";
import type { PluginOption } from "vite";

/** The app's service worker plugins, which have no place in Storybook's build. */
function isPwaPlugin(plugin: PluginOption) {
  return (
    typeof plugin === "object" &&
    plugin !== null &&
    "name" in plugin &&
    plugin.name.startsWith("vite-plugin-pwa")
  );
}

const config: StorybookConfig = {
  stories: ["../src/**/*.stories.tsx"],
  addons: [
    "@storybook/addon-docs",
    "@storybook/addon-a11y",
    "@storybook/addon-vitest",
  ],
  framework: "@storybook/react-vite",
  core: { disableTelemetry: true },
  viteFinal: (vite) => ({
    ...vite,
    plugins: (vite.plugins ?? [])
      .flat(2)
      .filter((plugin) => !isPwaPlugin(plugin)),
  }),
};

export default config;
