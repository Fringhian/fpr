import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { fromNodeHeaders } from "better-auth/node";
import { z } from "zod";
import type { ApiContext } from "../orpc.js";

/**
 * Better Auth's sessions for FPR's own ways in: the first admin, a claimed
 * access link, and an anonymous viewer's link. Its one endpoint is
 * server-only, reached through `auth.api` and never over HTTP. It starts the
 * session as password sign-in does, with Better Auth's session and cookie,
 * so the access check on new sessions applies to it too.
 */
export const accessSessions = () =>
  ({
    id: "fpr-access-sessions",
    endpoints: {
      startAccessSession: createAuthEndpoint.serverOnly(
        { method: "POST", body: z.object({ userId: z.string() }) },
        async (ctx) => {
          const { internalAdapter } = ctx.context;
          const user = await internalAdapter.findUserById(ctx.body.userId);
          if (user === null) {
            throw new APIError("NOT_FOUND");
          }
          const session = await internalAdapter.createSession(user.id);
          await setSessionCookie(ctx, { session, user });
          return ctx.json({ sessionId: session.id });
        },
      ),
    },
  }) satisfies BetterAuthPlugin;

/**
 * Starts a session for the person, with Better Auth's cookie on the
 * response. The person must hold an access key that gives access.
 */
export async function startSession(
  { auth, req, res }: Pick<ApiContext, "auth" | "req" | "res">,
  userId: string,
): Promise<void> {
  const { headers } = await auth.api.startAccessSession({
    body: { userId },
    headers: fromNodeHeaders(req.headers),
    returnHeaders: true,
  });
  for (const cookie of headers.getSetCookie()) {
    res.append("Set-Cookie", cookie);
  }
}
