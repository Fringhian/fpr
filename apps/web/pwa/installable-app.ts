import type { Plugin, PluginOption } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import { themeColor } from "./theme.ts";

const page = themeColor("page");

/**
 * The page's `theme-color` meta tag, on the page ground until a sky band
 * paints it peach (`src/components/foundations/sky/sky-theme-color.ts`).
 */
function themeColorMeta(): Plugin {
  return {
    name: "fpr:theme-color",
    transformIndexHtml: () => [
      {
        tag: "meta",
        attrs: { name: "theme-color", content: page },
        injectTo: "head",
      },
    ],
  };
}

/**
 * The app as a Progressive Web App: the manifest, and a service worker that
 * precaches the app shell and leaves every `/api` request to the network. A
 * new version waits until the person reloads (`src/lib/app-update.tsx`).
 * `src/main.tsx` registers it outside the mock mode, where MSW's worker holds
 * the scope.
 */
export function installableApp(): PluginOption[] {
  return [
    themeColorMeta(),
    VitePWA({
      registerType: "prompt",
      injectRegister: false,
      includeManifestIcons: false,
      manifest: {
        id: "/",
        name: "FPR",
        short_name: "FPR",
        lang: "fr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        theme_color: page,
        background_color: page,
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "/icons/icon-maskable-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{html,js,css,woff2,png}"],
        globIgnores: ["mockServiceWorker.js"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [],
      },
    }),
  ];
}
