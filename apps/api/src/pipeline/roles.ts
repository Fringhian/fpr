import { type Access, Role } from "@fpr/contracts";
import { os } from "@orpc/server";
import { apiError } from "../errors.js";
import { isWrite, routeAccess } from "./route.js";
import type { PipelineContext, Viewer } from "./session.js";

/**
 * The role guard: the route's declared roles accept the person's role, and
 * anonymous viewers write nothing, whatever the route lists. Otherwise the
 * answer is `forbidden`. A public route skips it.
 */
export const guardRoles = os
  .$context<PipelineContext>()
  .middleware(({ context, next, procedure }) => {
    const access = routeAccess(procedure);
    if (access === "public") {
      return next();
    }
    if (context.viewer === null) {
      throw apiError("unauthenticated");
    }
    if (!mayCall(context.viewer, access, isWrite(procedure))) {
      throw apiError("forbidden");
    }
    return next();
  });

/** Whether a signed-in route's roles accept the person, for a read or a write. */
function mayCall(
  viewer: Viewer,
  roles: Exclude<Access, "public">,
  write: boolean,
): boolean {
  return (
    roles.includes(viewer.role) && !(write && viewer.role === Role.anonymous)
  );
}
