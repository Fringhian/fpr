import { errorMap } from "../contract.js";
import { refreshRunSchema, refreshStateSchema } from "../schemas/refresh.js";
import { internalRoute } from "./base.js";

export const pricesRefresh = internalRoute
  .route({
    method: "POST",
    path: "/refresh",
    summary: "Run the intraday refresh now",
  })
  .output(refreshRunSchema)
  .errors(
    errorMap("refresh_running", "call_budget_used", "provider_unavailable"),
  );

export const pricesRefreshState = internalRoute
  .route({
    method: "GET",
    path: "/refresh",
    summary: "Read the intraday refresh's state",
  })
  .output(refreshStateSchema);
