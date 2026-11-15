import { accessKeys } from "@fpr/db";
import { os } from "@orpc/server";
import { fromNodeHeaders } from "better-auth/node";
import type { RequestHandler } from "express";
import { authBasePath } from "../auth.js";
import { ApiError, apiError } from "../errors.js";
import type { ApiServices } from "../orpc.js";
import type { PipelineContext } from "./session.js";

/**
 * Whether the person's access key still gives access. Without one, every
 * session of the person is deleted.
 */
export async function keepsAccess(
  { db, auth }: Pick<ApiServices, "db" | "auth">,
  userId: string,
): Promise<boolean> {
  if (await accessKeys.hasAccess(db, userId)) {
    return true;
  }
  const { internalAdapter } = await auth.$context;
  await internalAdapter.deleteUserSessions(userId);
  return false;
}

/**
 * The access check: without an access key giving access, the person's
 * sessions are deleted and the answer is `access_ended`. A public route,
 * which has no viewer, skips it.
 */
export const checkAccess = os
  .$context<PipelineContext>()
  .middleware(async ({ context, next }) => {
    const { viewer } = context;
    if (viewer !== null && !(await keepsAccess(context, viewer.id))) {
      throw apiError("access_ended");
    }
    return next();
  });

/** Better Auth's paths that skip the access check: sign-in checks access itself. */
const pathsWithoutAccessCheck = [
  `${authBasePath}/sign-in/`,
  `${authBasePath}/sign-out`,
] as const;

/**
 * The access check in front of Better Auth's own endpoints. A request with
 * a session whose person's access ended deletes their sessions and is
 * answered `access_ended`. Sign-in checks access when the session starts,
 * and sign-out ends the session anyway, so both go straight to Better Auth:
 * a stale cookie never blocks another person's sign-in on the same browser.
 */
export function authAccessCheck(
  services: Pick<ApiServices, "db" | "auth">,
): RequestHandler {
  return async (req, _res, next) => {
    if (
      req.headers.cookie === undefined ||
      pathsWithoutAccessCheck.some((path) => req.path.startsWith(path))
    ) {
      next();
      return;
    }
    // Reading the session here leaves extending it to Better Auth's own
    // endpoint, which sends the renewed cookie.
    const session = await services.auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
      query: { disableRefresh: true },
    });
    if (session === null || (await keepsAccess(services, session.user.id))) {
      next();
      return;
    }
    next(new ApiError("access_ended"));
  };
}
