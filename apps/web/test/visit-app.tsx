import type { Id } from "@fpr/contracts";
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
import { createI18n } from "../src/lib/i18n.ts";
import { createMockHandlers } from "../src/mocks/handlers.ts";
import type { Persona } from "../src/mocks/personas.ts";
import { createAppRouter } from "../src/router.ts";

const origin = "http://fpr.test";
const roots: Root[] = [];

beforeAll(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
});

afterEach(() => {
  for (const root of roots.splice(0)) {
    act(() => root.unmount());
  }
  document.body.replaceChildren();
});

/**
 * The app at `path`, on the mock API signed in as `session`, once its routes
 * have loaded and rendered. `failMe` answers `GET /me` with a server error.
 */
export async function visit(
  path: string,
  session: Persona | Id,
  { failMe = false }: { failMe?: boolean } = {},
) {
  const { handlers } = createMockHandlers({ origin, session });
  const onAccessEnded: Mock<() => void> = vi.fn();
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
  const queryClient = createQueryClient();
  queryClient.setDefaultOptions({ queries: { retry: false } });
  const router = createAppRouter({
    queryClient,
    api,
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  const page = document.createElement("div");
  document.body.append(page);
  const root = createRoot(page);
  roots.push(root);
  await act(async () => {
    await router.load();
    root.render(
      <I18nextProvider i18n={createI18n("en")}>
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
  };
}
