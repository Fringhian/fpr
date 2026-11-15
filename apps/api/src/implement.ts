import { apiContract } from "@fpr/contracts";
import { implement } from "@orpc/server";
import type { ApiContext } from "./orpc.js";
import { requestPipeline } from "./pipeline/index.js";

/**
 * Every route of `apiContract`, behind the request pipeline, to implement
 * its handler. A handler reads the signed-in person from `context.viewer`,
 * once `.use(signedIn)` has narrowed it on a signed-in route. Handlers live
 * in their area's folder and import it from here; `router.ts` gathers them.
 */
export const api = implement(apiContract)
  .$context<ApiContext>()
  .use(requestPipeline);
