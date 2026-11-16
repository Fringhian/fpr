import {
  createTanstackQueryUtils,
  type RouterUtils,
} from "@orpc/tanstack-query";
import { signOutOnAccessEnded } from "../session/session-ended.ts";
import { type ApiClient, createApiClient } from "./client.ts";

/** TanStack Query's options for each route of an API client. */
export type Api = RouterUtils<ApiClient>;

/** The API's base URL, on the app's own origin: the contracts' routes and Better Auth's `/auth` both sit under it. */
export const API_URL = `${window.location.origin}/api`;

/**
 * The app's one API client, with TanStack Query's options for each route:
 * `useQuery(api.race.members.queryOptions({ input }))` to read,
 * `useMutation(api.portfolio.addChange.mutationOptions())` to write, so the
 * query client invalidates what the write makes stale.
 */
export const api: Api = createTanstackQueryUtils(
  createApiClient({
    url: API_URL,
    onAccessEnded: signOutOnAccessEnded,
  }),
);
