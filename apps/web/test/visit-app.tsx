import type { Id, Language } from "@fpr/contracts";
import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { QueryClientProvider } from "@tanstack/react-query";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { getResponse } from "msw";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { I18nextProvider } from "react-i18next";
import { afterEach, beforeAll, type Mock, vi } from "vitest";
import { createApiClient } from "../src/lib/api/client.ts";
import { createQueryClient } from "../src/lib/api/query-client.ts";
import { createI18n, syncDocumentLanguage } from "../src/lib/i18n.ts";
import { languageOf } from "../src/lib/language-choice.ts";
import { createMockHandlers } from "../src/mocks/handlers.ts";
import type { Persona } from "../src/mocks/personas.ts";
import { createAppRouter } from "../src/router.ts";

// Lightweight Charts draws on a canvas in the theme's colours, which happy-dom
// has neither of: the visits' charts render nothing.
vi.mock("../src/components/molecules/chart/chart.tsx", () => ({
  Chart: () => null,
}));

// The page's own origin, where the app calls the API and Better Auth alike.
const { origin } = window.location;
const LANGUAGE_KEY = "fpr.language.v1";
const roots: Root[] = [];

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

afterEach(() => {
  for (const root of roots.splice(0)) {
    act(() => root.unmount());
  }
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

/**
 * The app at `path`, on the mock API signed in as `session`, once its routes
 * have loaded and rendered. Better Auth's endpoints, which the app calls with
 * `fetch`, answer from the same mock. `failMe` answers `GET /me` with a
 * server error. `language` is the one picked on the device before the visit,
 * English by default, or `null` for none; a signed-in person's own language
 * wins. `empty` starts an instance with nobody yet.
 */
export async function visit(
  path: string,
  session: Persona | Id,
  {
    failMe = false,
    language = "en",
    empty = false,
  }: { failMe?: boolean; language?: Language | null; empty?: boolean } = {},
) {
  if (language === null) {
    localStorage.removeItem(LANGUAGE_KEY);
  } else {
    localStorage.setItem(LANGUAGE_KEY, language);
  }
  const { handlers, store } = createMockHandlers({ origin, session, empty });
  vi.stubGlobal(
    "fetch",
    async (input: RequestInfo | URL, init?: RequestInit) =>
      (await getResponse(handlers, new Request(input, init))) ??
      Response.error(),
  );
  const onAccessEnded: Mock<() => void> = vi.fn();
  const onSessionExpired: Mock<() => void> = vi.fn();
  const api = createTanstackQueryUtils(
    createApiClient({
      url: `${origin}/api`,
      fetch: async (request) =>
        failMe && new URL(request.url).pathname === "/api/me"
          ? new Response(null, { status: 502 })
          : ((await getResponse(handlers, request)) ?? Response.error()),
      onAccessEnded,
    }),
  );
  const queryClient = createQueryClient({ onSessionExpired });
  queryClient.setDefaultOptions({ queries: { retry: false } });
  const i18n = createI18n(languageOf(null));
  syncDocumentLanguage(i18n);
  const router = createAppRouter({
    queryClient,
    api,
    i18n,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  const page = document.createElement("div");
  document.body.append(page);
  const root = createRoot(page);
  roots.push(root);
  await act(async () => {
    await router.load();
    root.render(
      <I18nextProvider i18n={i18n}>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </I18nextProvider>,
    );
  });
  return {
    router,
    page,
    location: router.state.location,
    /** The search the page reads, once its route validated it. */
    search: router.state.matches.at(-1)?.search,
    text: page.textContent ?? "",
    onAccessEnded,
    onSessionExpired,
    queryClient,
    /** The mock API's store, to change what it answers mid-visit. */
    store,
  };
}
