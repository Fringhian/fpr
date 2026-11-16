import { type Role, roleSchema } from "@fpr/contracts";
import { os } from "@orpc/server";
import { fromNodeHeaders } from "better-auth/node";
import { apiError } from "../errors.js";
import type { ApiContext } from "../orpc.js";
import { routeAccess } from "./route.js";

/** The signed-in person a request acts for. */
export interface Viewer {
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

/**
 * The session: Better Auth reads the session cookie, and the person signed
 * in becomes `context.viewer`. Without a session, the answer is
 * `unauthenticated`. A public route skips it, with `viewer` set to `null`.
 */
export const readSession = os
  .$context<ApiContext>()
  .middleware(async ({ context, next, procedure }) => {
    const viewer =
      routeAccess(procedure) === "public" ? null : await sessionViewer(context);
    return next({ context: { viewer } });
  });

/**
 * The person signed in with the request's session cookie. When Better Auth
 * extends the session, its renewed cookie goes on the response, and the
 * request log line carries the person's id.
 */
async function sessionViewer({ req, res, auth }: ApiContext): Promise<Viewer> {
  const { headers, response } = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
    returnHeaders: true,
  });
  for (const cookie of headers.getSetCookie()) {
    res.append("Set-Cookie", cookie);
  }
  if (response === null) {
    throw apiError("unauthenticated");
  }
  res.locals.userId = response.user.id;
  return {
    id: response.user.id,
    role: roleSchema.parse(response.user.role),
    sessionId: response.session.id,
  };
}
