import { QueryClientProvider } from "@tanstack/react-query";
import { createRouter, RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { createQueryClient } from "./lib/api/query-client.ts";
import { createI18n, syncDocumentLanguage } from "./lib/i18n.ts";
import { DEFAULT_LANGUAGE } from "./lib/language.ts";
import { routeTree } from "./routeTree.gen.ts";
import "./index.css";

// `pnpm dev:mock` answers every API call with the mock API. Any other mode
// drops this branch, and the mocks with it, from the build.
if (import.meta.env.MODE === "mock") {
  const { startMockApi } = await import("./mocks/browser.ts");
  await startMockApi();
}

const i18n = createI18n(DEFAULT_LANGUAGE);
syncDocumentLanguage(i18n);

const queryClient = createQueryClient();

const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  scrollRestoration: true,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

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
