import {
  keepPreviousData,
  MutationCache,
  QueryCache,
  QueryClient,
} from "@tanstack/react-query";
import { holdsSession } from "../session/session-query.ts";
import { isApiError, isRefusal } from "./errors.ts";
import { invalidateAfter } from "./invalidation.ts";

/**
 * The app's TanStack Query cache. Every successful write invalidates the
 * reads its row of `invalidations` names, and settles once they are fetched
 * again. A read the API refused isn't retried. A read or a write answered
 * `401 unauthenticated` while the cache holds a signed-in person means the
 * session expired mid-visit, and runs `onSessionExpired`.
 */
export function createQueryClient({
  onSessionExpired,
}: {
  onSessionExpired: () => void;
}): QueryClient {
  const endExpiredSession = (error: unknown) => {
    if (isApiError(error, "unauthenticated") && holdsSession(queryClient)) {
      onSessionExpired();
    }
  };
  const queryClient: QueryClient = new QueryClient({
    queryCache: new QueryCache({ onError: endExpiredSession }),
    mutationCache: new MutationCache({
      onSuccess: (_data, _variables, _result, mutation) =>
        invalidateAfter(queryClient, mutation.options.mutationKey),
      onError: endExpiredSession,
    }),
    defaultOptions: {
      queries: {
        retry: (failures, error) => failures < 3 && !isRefusal(error),
      },
    },
  });
  return queryClient;
}

/**
 * The query options of a read that shows prices, spread into its
 * `queryOptions`: fetched again every 5 minutes while the page is visible, and
 * whenever the window regains focus. Each refetch reads Postgres only.
 */
export const livePrices = {
  refetchInterval: 5 * 60 * 1000,
  refetchIntervalInBackground: false,
  refetchOnWindowFocus: "always",
} as const;

/** A price read that a page keeps on screen while a new period or unit loads. */
export const liveView = {
  ...livePrices,
  placeholderData: keepPreviousData,
} as const;
