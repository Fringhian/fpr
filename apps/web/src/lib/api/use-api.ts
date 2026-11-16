import { useRouteContext } from "@tanstack/react-router";
import type { Api } from "./api.ts";

/** The router's API client, with TanStack Query's options for each route. */
export function useApi(): Api {
  return useRouteContext({
    from: "__root__",
    select: (context) => context.api,
  });
}
