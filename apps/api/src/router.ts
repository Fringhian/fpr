import { accessRouter } from "./access/index.js";
import { apiError } from "./errors.js";
import { api } from "./implement.js";
import { signedIn } from "./pipeline/index.js";

export { api } from "./implement.js";

/**
 * The handlers of the routes in `apiContract`, with the same keys. A route
 * without a handler yet is not served, and answers `not_found`.
 */
export const apiRouter = {
  access: accessRouter,
  me: {
    // The request pipeline answers a request without a session. The person
    // signed in is answered with #76.
    get: api.me.get.use(signedIn).handler(() => {
      throw apiError("not_found");
    }),
  },
};
