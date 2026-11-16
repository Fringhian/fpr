import {
  createTanstackQueryUtils,
  type RouterUtils,
} from "@orpc/tanstack-query";
import { signOutOnAccessEnded } from "../session/access-ended.ts";
import { type ApiClient, createApiClient } from "./client.ts";

/** TanStack Query's options for each route of an API client. */
export type Api = RouterUtils<ApiClient>;

/**
 * The app's one API client, with TanStack Query's options for each route:
 * `useQuery(api.race.members.queryOptions({ input }))` to read,
 * `useMutation(api.portfolio.addChange.mutationOptions())` to write, so the
 * query client invalidates what the write makes stale.
 */
export const api: Api = createTanstackQueryUtils(
  createApiClient({
    url: `${window.location.origin}/api`,
    onAccessEnded: signOutOnAccessEnded,
  }),
);
