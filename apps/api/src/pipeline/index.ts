import { os } from "@orpc/server";
import { apiError } from "../errors.js";
import { checkAccess } from "./access.js";
import { checkOrigin } from "./origin.js";
import { limitPublicWrites } from "./rate-limit.js";
import { guardRoles } from "./roles.js";
import { type PipelineContext, readSession } from "./session.js";

export { authAccessCheck } from "./access.js";
export {
  createRateLimiter,
  publicWriteRateLimit,
  type RateLimiter,
} from "./rate-limit.js";
export type { PipelineContext, Viewer } from "./session.js";

/**
 * The checks every contract route goes through before oRPC validates its
 * input, in this order:
 *
 * 1. `checkOrigin`: a write whose `Origin` isn't `PUBLIC_URL` gets
 *    `forbidden`.
 * 2. `limitPublicWrites`: a public write past its client address's rate
 *    limit gets `rate_limited`.
 * 3. `readSession`: the session gives `context.viewer`. Without one, the
 *    answer is `unauthenticated`.
 * 4. `checkAccess`: without an access key giving access, the person's
 *    sessions are deleted and the answer is `access_ended`.
 * 5. `guardRoles`: the route's declared roles accept the person, and
 *    anonymous viewers write nothing. Otherwise the answer is `forbidden`.
 *
 * A public route skips the last three, and a signed-in route the rate
 * limit. A route whose contract declares no access is refused with
 * `forbidden`.
 */
export const requestPipeline = checkOrigin
  .concat(limitPublicWrites)
  .concat(readSession)
  .concat(checkAccess)
  .concat(guardRoles);

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
