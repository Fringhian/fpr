import { apiContract } from "@fpr/contracts";
import { implement } from "@orpc/server";
import { meRouter } from "./me/index.js";
import type { ApiContext } from "./orpc.js";
import { requestPipeline } from "./pipeline/index.js";

/**
 * Every route of `apiContract`, behind the request pipeline. A handler reads
 * the signed-in person from `context.viewer`, once `.use(signedIn)` has
 * narrowed it on a signed-in route.
 */
export const api = implement(apiContract)
  .$context<ApiContext>()
  .use(requestPipeline);

/** The implementer each area's handlers are built from. */
export type Api = typeof api;

/**
 * The handlers of the routes in `apiContract`, with the same keys. A route
 * without a handler yet is not served, and answers `not_found`.
 */
export const apiRouter = {
  me: meRouter(api),
};
