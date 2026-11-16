import { registerSW } from "virtual:pwa-register";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { api } from "./lib/api/api.ts";
import { createQueryClient } from "./lib/api/query-client.ts";
import { offerUpdate } from "./lib/app-update.tsx";
import { createI18n, syncDocumentLanguage } from "./lib/i18n.ts";
import { languageOf } from "./lib/language-choice.ts";
import { signInAgain } from "./lib/session/session-ended.ts";
import { createAppRouter } from "./router.ts";
import "./index.css";

// `pnpm dev:mock` answers every API call with the mock API. Any other mode
// drops this branch, and the mocks with it, from the build, and registers
// the app's service worker instead, which `pnpm dev` leaves out.
if (import.meta.env.MODE === "mock") {
  const { startMockApi } = await import("./mocks/browser.ts");
  await startMockApi();
} else {
  const updateApp = registerSW({
    onNeedRefresh: () => offerUpdate(() => void updateApp(true)),
    // An installed app can stay open for days: it looks for a new version
    // hourly. Offline or with the server down, a look fails until the next.
    onRegisteredSW: (_url, registration) => {
      setInterval(
        () => registration?.update().catch(() => undefined),
        60 * 60 * 1000,
      );
    },
  });
}

// The device's language until the session loads, which may switch it.
const i18n = createI18n(languageOf(null));
syncDocumentLanguage(i18n);

const queryClient = createQueryClient({ onSessionExpired: signInAgain });

const router = createAppRouter({ queryClient, api, i18n });

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("The #root element is missing from index.html");
}

createRoot(rootElement).render(
  <StrictMode>
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    </I18nextProvider>
  </StrictMode>,
);
