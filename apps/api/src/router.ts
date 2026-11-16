import { accessRouter } from "./access/index.js";
import { apiError } from "./errors.js";
import { api } from "./implement.js";
import { signedIn } from "./pipeline/index.js";

/**
 * The handlers of the routes in `apiContract`, with the same keys. A route
 * without a handler is not served, and answers `not_found`.
 */
export const apiRouter = {
  access: accessRouter,
  me: {
    get: api.me.get.use(signedIn).handler(() => {
      throw apiError("not_found");
    }),
  },
};
