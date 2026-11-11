import { z } from "zod";
import { errorMap } from "../contract.js";
import { internalRoute } from "./base.js";

export const pricesRefresh = internalRoute
  .route({
    method: "POST",
    path: "/refresh",
    summary: "Run the intraday refresh now",
  })
  .output(z.void())
  .errors(
    errorMap("refresh_running", "call_budget_used", "provider_unavailable"),
  );
