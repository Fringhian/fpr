import {
  keepPreviousData,
  MutationCache,
  onlineManager,
  QueryCache,
  QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { holdsSession } from "../session/session-query.ts";
import { isApiError, isRefusal } from "./errors.ts";
import { invalidateAfter } from "./invalidation.ts";

/**
 * The app's TanStack Query cache. Every successful write invalidates the
 * reads its row of `invalidations` names, and settles once they are fetched
 * again. A write refused with `value_changed` invalidates them too: someone
 * else's write changed what they show. TanStack Query's `onlineManager` is
 * the one source of whether the device is online, starting from the browser's
 * state. With no network, a read or a write fails at once instead of waiting
 * for one, so each screen and each form says it is offline; a write is never
 * queued to land unseen later, and a reconnection fetches again the reads
 * that failed. A read the API refused isn't retried. A read or a write
 * answered `401 unauthenticated` while the cache holds a signed-in person
 * means the session expired mid-visit, and runs `onSessionExpired`.
 */
export function createQueryClient({
  onSessionExpired,
}: {
  onSessionExpired: () => void;
}): QueryClient {
  // By default `onlineManager` assumes online until an `offline` event, so an
  // app opened with no network wouldn't know it.
  onlineManager.setEventListener((setOnline) => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  });
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
      onError: (error, _variables, _result, mutation) => {
        endExpiredSession(error);
        if (isApiError(error, "value_changed")) {
          void invalidateAfter(queryClient, mutation.options.mutationKey);
        }
      },
    }),
    defaultOptions: {
      queries: {
        networkMode: "always",
        // Off by default under "always".
        refetchOnReconnect: true,
        retry: (failures, error) =>
          failures < 3 && !isRefusal(error) && onlineManager.isOnline(),
      },
      mutations: { networkMode: "always" },
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

/**
 * A price read kept on screen like `liveView`, but only while the `subject`
 * of its input stays the same: a read of another member shows its own
 * loading and its own error, never the last member's data.
 */
export function liveViewFor<Input extends object>(
  input: Input,
  subject: keyof Input,
) {
  return {
    ...livePrices,
    placeholderData: <Data>(
      previous: Data | undefined,
      previousQuery: { queryKey: QueryKey } | undefined,
    ) => {
      // An oRPC query key is `[path, { input, type }]`.
      const key = previousQuery?.queryKey[1] as
        | { input?: Partial<Input> }
        | undefined;
      return key?.input?.[subject] === input[subject] ? previous : undefined;
    },
  } as const;
}
