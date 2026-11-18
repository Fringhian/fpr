import type { QueryClient } from "@tanstack/react-query";
import {
  createRouter,
  type ParsedLocation,
  type RouterHistory,
} from "@tanstack/react-router";
import type { i18n as I18n } from "i18next";
import type { Api } from "./lib/api/api.ts";
import { pagePlace } from "./lib/page-place.ts";
import { NotFound } from "./routes/-states/not-found.tsx";
import { routeTree } from "./routeTree.gen.ts";

/**
 * A new page, or a new step of a step flow, crossfades in as `theme.css`
 * draws it; a change that stays on the page, such as the period or the
 * search, swaps in place, and so does the first load. Only where the browser
 * types view transitions: elsewhere the router would start one on every
 * change, each keystroke of a search included.
 */
function pageTransition() {
  if (
    typeof CSS === "undefined" ||
    !CSS.supports("selector(:active-view-transition-type(page))")
  ) {
    return false;
  }
  return {
    types: ({
      fromLocation,
      toLocation,
    }: {
      fromLocation?: ParsedLocation;
      toLocation: ParsedLocation;
    }) =>
      fromLocation !== undefined &&
      pagePlace(fromLocation) !== pagePlace(toLocation)
        ? ["page"]
        : false,
  };
}

/**
 * The app's router, on the browser's address unless given another `history`.
 * An address no page answers falls to the splat of the deepest area that
 * holds it, behind that area's guard: `/admin/x` to the admin area's, any
 * other to the everyday pages'.
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
    defaultViewTransition: pageTransition(),
    scrollRestoration: true,
  });
}

declare module "@tanstack/react-router" {
  interface Register {
    router: ReturnType<typeof createAppRouter>;
  }
}
