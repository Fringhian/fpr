import type { z } from "zod";
import type { ErrorCode } from "./errors.js";
import { type Role, roles } from "./roles.js";

export const methods = ["get", "post", "put", "patch", "delete"] as const;

export type Method = (typeof methods)[number];

/** The statuses a route answers with when it succeeds. */
export type SuccessStatus = 200 | 201 | 204;

/** Who may call a route: anyone, or the signed-in roles it accepts. */
export type Access = "public" | readonly [Role, ...Role[]];

/** The names of a path's `:params`: `"userId" | "id"` for `/users/:userId/x/:id`. */
export type PathParamNames<Path extends string> =
  Path extends `${string}:${infer Name}/${infer Rest}`
    ? Name | PathParamNames<`/${Rest}`>
    : Path extends `${string}:${infer Name}`
      ? Name
      : never;

/** A path param arrives as a string, and its schema may refine it. */
export type PathParamSchema = z.ZodType<unknown, string>;

/** One route of the API, or of the price service. */
export interface RouteContract<Path extends string = string> {
  method: Method;
  /** Under `/api`, with Express-style params: `/users/:userId/portfolio`. */
  path: Path;
  /** One line on what the route does. */
  summary: string;
  roles: Access;
  /** One schema per `:param` of the path. */
  params?: z.ZodObject<Record<string, PathParamSchema>>;
  /** Query values arrive as strings: a number or boolean is coerced. */
  query?: z.ZodObject;
  /** The JSON request body. */
  body?: z.ZodType;
  /** The JSON body of each success status, or `null` for no body. */
  responses: Partial<Record<SuccessStatus, z.ZodType | null>>;
  /**
   * The codes this route answers with beyond the ones every route of its kind
   * has. See `routeErrorCodes`.
   */
  errors?: readonly ErrorCode[];
}

/** Stands in for `params` on a path without `:params`, which declares none. */
export interface NoPathParams {
  readonly "this path has no :params": never;
}

/** A path with `:params` declares a schema for each of them. */
export type ParamsField<Path extends string> = [PathParamNames<Path>] extends [
  never,
]
  ? { params?: NoPathParams }
  : {
      params: z.ZodObject<{ [Name in PathParamNames<Path>]: PathParamSchema }>;
    };

/** The `:params` of a path, in order. */
export function pathParamNames(path: string): string[] {
  return [...path.matchAll(/:([A-Za-z0-9_]+)/g)].map((match) => match[1] ?? "");
}

/**
 * Declares a route. Also checks at runtime: the params schema has one key
 * per `:param` and no other, a `GET` has no body, and there is at least one
 * success status.
 */
export function defineRoute<const Route extends RouteContract>(
  route: Route & ParamsField<Route["path"]>,
): Route {
  const where = `${route.method.toUpperCase()} ${route.path}`;

  if (!route.path.startsWith("/")) {
    throw new Error(`${where}: the path starts with a slash`);
  }

  const expected = pathParamNames(route.path).sort();
  const declared = Object.keys(route.params?.shape ?? {}).sort();
  if (expected.join() !== declared.join()) {
    throw new Error(
      `${where}: params declares [${declared.join(", ")}], the path has [${expected.join(", ")}]`,
    );
  }

  if (route.method === "get" && route.body !== undefined) {
    throw new Error(`${where}: a GET route has no body`);
  }

  if (Object.keys(route.responses).length === 0) {
    throw new Error(`${where}: a route declares at least one response`);
  }

  return route;
}

/** Whether a route accepts every signed-in role. */
function acceptsEveryRole(access: Access): boolean {
  return access !== "public" && roles.every((role) => access.includes(role));
}

/**
 * Every code a route can answer with: its own, plus the ones the request
 * pipeline gives every route of its kind.
 * - `internal_error` for every route.
 * - `invalid_request` for a route with params, a query, or a body.
 * - `unauthenticated` and `access_ended` for a signed-in route.
 * - `forbidden` for a write, refused when its `Origin` isn't `PUBLIC_URL`,
 *   and for a route that refuses a role.
 */
export function routeErrorCodes(route: RouteContract): ErrorCode[] {
  const codes = new Set<ErrorCode>(route.errors ?? []);

  if (
    route.params !== undefined ||
    route.query !== undefined ||
    route.body !== undefined
  ) {
    codes.add("invalid_request");
  }
  if (route.roles !== "public") {
    codes.add("unauthenticated");
    codes.add("access_ended");
  }
  if (
    route.method !== "get" ||
    (route.roles !== "public" && !acceptsEveryRole(route.roles))
  ) {
    codes.add("forbidden");
  }
  codes.add("internal_error");

  return [...codes];
}
