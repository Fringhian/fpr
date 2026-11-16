import type { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import type { Api } from "../lib/api/api.ts";
import { guard } from "../lib/session/access.ts";
import { loadSession } from "../lib/session/session-query.ts";
import { LoadFailed } from "./-states/load-failed.tsx";

/**
 * The guards, in one place: before any route loads, the session from
 * `GET /me`, then the access the deepest matched route names in its
 * `staticData`, decide whether the visitor enters or where they go instead.
 * An address no route answers falls to the everyday pages' Page not found,
 * behind the same guard.
 */
export const Route = createRootRouteWithContext<{
  queryClient: QueryClient;
  api: Api;
}>()({
  beforeLoad: async ({ context, matches, location }) => {
    const me = await loadSession(context);
    const access = matches.findLast(
      (match) => match.staticData.access !== undefined,
    )?.staticData.access;
    const target = guard({ access, me, href: location.href });
    if (target !== undefined) {
      throw redirect(target);
    }
  },
  component: Outlet,
  errorComponent: LoadFailed,
});
