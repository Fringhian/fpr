import { accessRouter } from "./access/index.js";
import { adminRouter } from "./admin/index.js";
import { meRouter } from "./me/index.js";
import { portfolioRouter } from "./portfolio/index.js";

/**
 * The handlers of the routes in `apiContract`, with the same keys. A route
 * without a handler is not served, and answers `not_found`.
 */
export const apiRouter = {
  access: accessRouter,
  admin: adminRouter,
  me: meRouter,
  portfolio: portfolioRouter,
};
