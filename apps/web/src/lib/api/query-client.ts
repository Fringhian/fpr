import { MutationCache, QueryClient } from "@tanstack/react-query";
import { isRefusal } from "./errors.ts";
import { invalidateAfter } from "./invalidation.ts";

/**
 * The app's TanStack Query cache. Every successful write invalidates the
 * reads its row of `invalidations` names, and settles once they are fetched
 * again. A read the API refused isn't retried.
 */
export function createQueryClient(): QueryClient {
  const queryClient: QueryClient = new QueryClient({
    mutationCache: new MutationCache({
      onSuccess: (_data, _variables, _result, mutation) =>
        invalidateAfter(queryClient, mutation.options.mutationKey),
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
