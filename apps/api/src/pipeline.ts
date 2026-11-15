import {
  type Access,
  type ErrorCode,
  errorStatus,
  Role,
  type RouteMeta,
  roleSchema,
} from "@fpr/contracts";
import { accessKeys } from "@fpr/db";
import { ORPCError, os } from "@orpc/server";
import { fromNodeHeaders } from "better-auth/node";
import type { ApiContext } from "./orpc.js";

/** The signed-in person a request acts for. */
export interface Viewer {
  /** Their user id. */
  id: string;
  role: Role;
  /** The session the request came with. */
  sessionId: string;
}

/** What a handler receives once the request pipeline has run. */
export interface PipelineContext extends ApiContext {
  /** The signed-in person, or `null` on a public route. */
  viewer: Viewer | null;
}

/** An error the API answers on purpose, sent with its code's status. */
export function apiError(
  code: ErrorCode,
  details?: Record<string, unknown>,
): ORPCError<ErrorCode, Record<string, unknown> | undefined> {
  return new ORPCError(code, { status: errorStatus[code], data: details });
}

const readMethods: ReadonlySet<string> = new Set(["GET", "HEAD"]);

/**
 * The checks every contract route goes through before its handler, from the
 * route's contract:
 *
 * 1. A write whose `Origin` isn't `PUBLIC_URL` is refused with `forbidden`.
 *    A public route goes straight to its handler.
 * 2. Session: Better Auth reads the session cookie. Without one, the answer
 *    is `unauthenticated`. A session extended on use comes with its renewed
 *    cookie.
 * 3. Access check: without an access key giving access, the person's
 *    sessions are deleted and the answer is `access_ended`.
 * 4. Role guard: the route's roles, from `signedInRoute(roles)`, accept the
 *    person's role, anonymous viewers write nothing, and a write to a
 *    `{userId}` path is the person's own unless they are the admin.
 *    Otherwise the answer is `forbidden`.
 *
 * oRPC then validates the input with the contract, and answers a failure
 * with `invalid_request`.
 */
export const requestPipeline = os
  .$context<ApiContext>()
  .$meta<RouteMeta>({ roles: "public" })
  .middleware(async ({ context, next, procedure }, input: unknown) => {
    const { route, meta } = procedure["~orpc"];
    const viewer = await admit(context, {
      roles: meta.roles,
      isWrite: !readMethods.has(route.method ?? "POST"),
      targetUserId: route.path?.includes("{userId}")
        ? pathUserId(input)
        : undefined,
    });
    return next({ context: { viewer } });
  });

/** What the request pipeline reads of a request's route. */
interface RouteCall {
  roles: Access;
  isWrite: boolean;
  /** The `{userId}` the route's path names, if it has one. */
  targetUserId: string | undefined;
}

/**
 * Runs the checks in order, and resolves with the signed-in person, or
 * `null` on a public route. Throws the error a refused request is answered
 * with.
 */
async function admit(
  context: ApiContext,
  { roles, isWrite, targetUserId }: RouteCall,
): Promise<Viewer | null> {
  if (isWrite && context.req.get("origin") !== context.publicOrigin) {
    throw apiError("forbidden");
  }
  if (roles === "public") {
    return null;
  }

  const viewer = await readViewer(context);
  if (viewer === null) {
    throw apiError("unauthenticated");
  }
  context.res.locals.userId = viewer.id;

  if (!(await accessKeys.hasAccess(context.db, viewer.id))) {
    const { internalAdapter } = await context.auth.$context;
    await internalAdapter.deleteUserSessions(viewer.id);
    throw apiError("access_ended");
  }

  if (!mayCall(viewer, roles, isWrite, targetUserId)) {
    throw apiError("forbidden");
  }
  return viewer;
}

/**
 * The person signed in with the request's session cookie, or `null`. When
 * Better Auth extends the session, its renewed cookie goes on the response.
 */
async function readViewer({
  req,
  res,
  auth,
}: ApiContext): Promise<Viewer | null> {
  const { headers, response } = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
    returnHeaders: true,
  });
  for (const cookie of headers.getSetCookie()) {
    res.append("Set-Cookie", cookie);
  }
  if (response === null) {
    return null;
  }
  return {
    id: response.user.id,
    role: roleSchema.parse(response.user.role),
    sessionId: response.session.id,
  };
}

/**
 * Whether the role guard lets the person call a signed-in route, given the
 * `{userId}` its path names, if any.
 */
function mayCall(
  viewer: Viewer,
  roles: Exclude<Access, "public">,
  isWrite: boolean,
  targetUserId: string | undefined,
): boolean {
  if (!roles.includes(viewer.role)) {
    return false;
  }
  if (!isWrite) {
    return true;
  }
  if (viewer.role === Role.anonymous) {
    return false;
  }
  return (
    targetUserId === undefined ||
    viewer.role === Role.admin ||
    targetUserId.toLowerCase() === viewer.id
  );
}

/**
 * The `{userId}` of the path, as the request sent it, before validation:
 * oRPC puts the path's parameters in the input, over any body field of the
 * same name.
 */
function pathUserId(input: unknown): string {
  return typeof input === "object" && input !== null && "userId" in input
    ? String(input.userId)
    : "";
}

/**
 * Narrows the context of a signed-in route's handler to its viewer:
 * `api.me.get.use(signedIn).handler(({ context }) => context.viewer.id)`.
 * The request pipeline has already refused a request without one.
 */
export const signedIn = os
  .$context<PipelineContext>()
  .middleware(({ context, next }) => {
    if (context.viewer === null) {
      throw apiError("unauthenticated");
    }
    return next({ context: { viewer: context.viewer } });
  });
