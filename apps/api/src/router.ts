import { apiContract } from "@fpr/contracts";
import { implement } from "@orpc/server";
import { apiError } from "./errors.js";
import type { ApiContext } from "./orpc.js";
import { requestPipeline, signedIn } from "./pipeline/index.js";

/**
 * Every route of `apiContract`, behind the request pipeline. A handler reads
 * the signed-in person from `context.viewer`, once `.use(signedIn)` has
 * narrowed it on a signed-in route.
 */
export const api = implement(apiContract)
  .$context<ApiContext>()
  .use(requestPipeline);

/**
 * The handlers of the routes in `apiContract`, with the same keys. A route
 * without a handler yet is not served, and answers `not_found`.
 */
export const apiRouter = {
  me: {
    // The request pipeline answers a request without a session. The person
    // signed in is answered with #76.
    get: api.me.get.use(signedIn).handler(() => {
      throw apiError("not_found");
    }),
  },
};
