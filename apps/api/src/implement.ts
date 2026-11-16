import { apiContract } from "@fpr/contracts";
import { implement } from "@orpc/server";
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
