import type { QueryClient } from "@tanstack/react-query";
import { createRouter, type RouterHistory } from "@tanstack/react-router";
import type { Api } from "./lib/api/api.ts";
import { NotFound } from "./routes/-states/not-found.tsx";
import { routeTree } from "./routeTree.gen.ts";

/**
 * The app's router, on the browser's address unless given another `history`.
 * A missing page shows inside the deepest layout that matched, such as the
 * admin area's.
 */
export function createAppRouter({
  queryClient,
  api,
  history,
}: {
  queryClient: QueryClient;
  api: Api;
  history?: RouterHistory;
}) {
  return createRouter({
    routeTree,
    context: { queryClient, api },
    ...(history === undefined ? {} : { history }),
    defaultPreload: "intent",
    defaultNotFoundComponent: NotFound,
    scrollRestoration: true,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
