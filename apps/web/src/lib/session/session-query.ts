import type { Me } from "@fpr/contracts";
import { generateOperationKey } from "@orpc/tanstack-query";
import { type QueryClient, queryOptions } from "@tanstack/react-query";
import type { Api } from "../api/api.ts";
import { isApiError } from "../api/errors.ts";
import { setRaceTimeZone } from "../race-day.ts";

/** An answer that nobody is signed in, or that the person's access has ended. */
function endsSession(error: unknown): boolean {
  return (
    isApiError(error, "unauthenticated") || isApiError(error, "access_ended")
  );
}

/** Whether the cache holds a signed-in person: the visit has a session. */
export function holdsSession(queryClient: QueryClient): boolean {
  return queryClient
    .getQueriesData<Me | null>({
      queryKey: generateOperationKey(["me", "get"]),
    })
    .some(([, me]) => me != null);
}

/**
 * `GET /me` as the session: the signed-in person, or `null` when the API
 * answers that nobody is signed in or that their access has ended. The key is
 * the route's own, so a write that invalidates `me` reloads it. It stays
 * fresh until invalidated: every write that starts or ends a session does.
 * A failed load isn't retried: every page waits on it, so the page shows
 * Retry at once instead of staying blank.
 */
export function sessionQuery(api: Api) {
  return queryOptions({
    queryKey: [...api.me.get.queryKey()],
    queryFn: async ({ client }): Promise<Me | null> => {
      try {
        const me = await api.me.get.call();
        setRaceTimeZone(me.raceTimeZone);
        return me;
      } catch (error) {
        // A session held until now that ends mid-visit stays an error, so the
        // cache keeps the person while the page is replaced: the screens
        // never see the session turn to `null` under them.
        if (endsSession(error) && !holdsSession(client)) {
          return null;
        }
        throw error;
      }
    },
    staleTime: Number.POSITIVE_INFINITY,
    retry: false,
  });
}

/**
 * The session, fetched before a route loads. Unlike `ensureQueryData`,
 * `fetchQuery` fetches again once the session was invalidated, so the guards
 * see a sign-in or a finished onboarding at the next navigation. A session
 * that ended mid-visit reads as signed out.
 */
export async function loadSession(context: {
  queryClient: QueryClient;
  api: Api;
}): Promise<Me | null> {
  try {
    return await context.queryClient.fetchQuery(sessionQuery(context.api));
  } catch (error) {
    if (endsSession(error)) {
      return null;
    }
    throw error;
  }
}
