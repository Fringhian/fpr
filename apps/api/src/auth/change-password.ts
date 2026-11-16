import { Role } from "@fpr/contracts";
import {
  APIError,
  createAuthMiddleware,
  getSessionFromCtx,
} from "better-auth/api";

/**
 * FPR's rules on Better Auth's `/change-password`, whatever the client sends:
 * anonymous viewers, who have no password, are refused with `forbidden`, and
 * a change always ends the person's other sessions.
 */
export const changePasswordRules = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== "/change-password") {
    return;
  }
  const session = await getSessionFromCtx(ctx);
  if (session?.user.role === Role.anonymous) {
    throw new APIError("FORBIDDEN", {
      code: "forbidden",
      message: "Anonymous viewers have no password",
    });
  }
  const body: unknown = ctx.body;
  return {
    context: {
      body: {
        ...(typeof body === "object" && body !== null ? body : {}),
        revokeOtherSessions: true,
      },
    },
  };
});
