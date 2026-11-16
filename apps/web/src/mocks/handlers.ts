import type { ErrorBody, Id } from "@fpr/contracts";
import { HttpResponse, http } from "msw";
import routes from "../lib/api/contract.gen.json";
import { betterAuthHandlers } from "./domains/better-auth.ts";
import { type Persona, sessionOf } from "./personas.ts";
import { createMockApi } from "./server/router.ts";
import {
  createMockStore,
  type MockStoreOptions,
} from "./store/create-store.ts";
import type { MockStore } from "./store/types.ts";

type Route = { method: string; path: string };

type RouteTable = {
  readonly [key: string]: RouteTable | { "~orpc": { route: Route } };
};

/** Every route of the generated table, with its method and path. */
function contractRoutes(table: RouteTable): Route[] {
  return Object.values(table).flatMap((entry) =>
    "~orpc" in entry
      ? [(entry["~orpc"] as { route: Route }).route]
      : contractRoutes(entry as RouteTable),
  );
}

const methods = {
  GET: http.get,
  POST: http.post,
  PUT: http.put,
  PATCH: http.patch,
  DELETE: http.delete,
} as const;

export type MockApiOptions = Omit<MockStoreOptions, "session"> & {
  /** Who is signed in: a persona, or a person's id. Signed out by default. */
  session?: Persona | Id | null;
  /** The origin the app calls, such as `http://localhost:5173`. */
  origin: string;
};

/**
 * The mock API as MSW handlers on a fresh store: one per route of the
 * contracts, from `contract.gen.json`, each answered by the contracts'
 * implementation on the store, then Better Auth's endpoints, and
 * `not_found` for any other `/api` path.
 */
export function createMockHandlers({
  session,
  origin,
  ...options
}: MockApiOptions) {
  const store: MockStore = createMockStore({
    ...options,
    session: sessionOf(session),
  });
  const api = createMockApi(store, origin);
  const notFound = () =>
    HttpResponse.json({ error: { code: "not_found" } } satisfies ErrorBody, {
      status: 404,
    });
  const answer = async ({ request }: { request: Request }) =>
    (await api(request)) ?? notFound();
  const routeHandlers = contractRoutes(routes as RouteTable).map(
    ({ method, path }) =>
      methods[method as keyof typeof methods](
        `${origin}/api${path.replace(/\{(\w+)\}/g, ":$1")}`,
        answer,
      ),
  );
  return {
    store,
    handlers: [
      ...betterAuthHandlers(store, origin),
      ...routeHandlers,
      http.all(`${origin}/api/*`, notFound),
    ],
  };
}
