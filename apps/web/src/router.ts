import type { QueryClient } from "@tanstack/react-query";
import { createRouter, type RouterHistory } from "@tanstack/react-router";
import type { i18n as I18n } from "i18next";
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
  i18n,
  history,
}: {
  queryClient: QueryClient;
  api: Api;
  /** The app's one i18next instance, which the session's language switches. */
  i18n: I18n;
  history?: RouterHistory;
}) {
  return createRouter({
    routeTree,
    context: { queryClient, api, i18n },
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
