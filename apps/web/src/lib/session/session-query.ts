import type { Me } from "@fpr/contracts";
import { type QueryClient, queryOptions } from "@tanstack/react-query";
import type { Api } from "../api/api.ts";
import { isApiError } from "../api/errors.ts";

/**
 * `GET /me` as the session: the signed-in person, or `null` when the API
 * answers that nobody is signed in or that their access has ended. Any other
 * failure stays an error. The key is the route's own, so a write that
 * invalidates `me` reloads it. It stays fresh until invalidated: every
 * write that starts or ends a session does.
 */
export function sessionQuery(api: Api) {
  return queryOptions({
    queryKey: [...api.me.get.queryKey()],
    queryFn: async (): Promise<Me | null> => {
      try {
        return await api.me.get.call();
      } catch (error) {
        if (
          isApiError(error, "unauthenticated") ||
          isApiError(error, "access_ended")
        ) {
          return null;
        }
        throw error;
      }
    },
    staleTime: Number.POSITIVE_INFINITY,
  });
}

/**
 * The session, fetched before a route loads. Unlike `ensureQueryData`,
 * `fetchQuery` fetches again once the session was invalidated, so the guards
 * see a sign-in or a finished onboarding at the next navigation.
 */
export function loadSession(context: {
  queryClient: QueryClient;
  api: Api;
}): Promise<Me | null> {
  return context.queryClient.fetchQuery(sessionQuery(context.api));
}
