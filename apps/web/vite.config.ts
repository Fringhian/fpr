import { rmSync } from "node:fs";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defaultClientConditions, defineConfig, type Plugin } from "vite";
import { installableApp } from "./pwa/installable-app.ts";

/**
 * Leaves MSW's worker, which `public/` keeps for the mock API, out of the
 * app's `dist/`: only `pnpm dev:mock` and Storybook, which builds elsewhere,
 * register it.
 */
function dropMockWorker(): Plugin {
  let worker: string | null = null;
  return {
    name: "fpr:drop-mock-worker",
    apply: (_, { command, mode }) => command === "build" && mode !== "mock",
    configResolved(config) {
      const outDir = resolve(config.root, config.build.outDir);
      worker =
        outDir === resolve(config.root, "dist")
          ? resolve(outDir, "mockServiceWorker.js")
          : null;
    },
    closeBundle() {
      if (worker !== null) {
        rmSync(worker, { force: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    dropMockWorker(),
    installableApp(),
  ],
  resolve: { conditions: ["@fpr/source", ...defaultClientConditions] },
  server: {
    // Like `web` in production, the proxy sends the client's address in
    // X-Forwarded-For, which the API's rate limits are kept for.
    proxy: {
      "/api": { target: "http://localhost:3000", xfwd: true },
    },
  },
});
