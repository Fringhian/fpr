import { createTanstackQueryUtils } from "@orpc/tanstack-query";
import { signOutOnAccessEnded } from "../session/access-ended.ts";
import { createApiClient } from "./client.ts";

/**
 * The app's one API client, with TanStack Query's options for each route:
 * `useQuery(api.race.members.queryOptions({ input }))` to read,
 * `useMutation(api.portfolio.addChange.mutationOptions())` to write, so the
 * query client invalidates what the write makes stale.
 */
export const api = createTanstackQueryUtils(
  createApiClient({
    url: `${window.location.origin}/api`,
    onAccessEnded: signOutOnAccessEnded,
  }),
);
