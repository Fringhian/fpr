import { service } from "../orpc.js";
import { providerRefusal } from "./provider-refusal.js";

/**
 * `POST /shares/:id/history`: answers once the share's closes from `from`
 * are stored. `not_found` for a missing or manual share.
 */
export const fillHistory = service.fillHistory.handler(
  async ({ input, context, errors }) => {
    let history: Awaited<ReturnType<typeof context.pricing.fillHistory>>;
    try {
      history = await context.pricing.fillHistory(input.id, input.from);
    } catch (error) {
      throw providerRefusal(error, errors);
    }
    if (history === undefined) {
      throw errors.not_found();
    }
    return history;
  },
);

/**
 * `POST /refresh`: runs the intraday refresh now and answers with the run.
 * A run in which some shares failed is still answered; one in which every
 * share failed is refused with what stopped it.
 */
export const refresh = service.refresh.handler(async ({ context, errors }) => {
  const outcome = await context.pricing.refresh.run("request");
  if (outcome === undefined) {
    throw errors.refresh_running();
  }
  const { run, cause } = outcome;
  if (run.status === "skipped") {
    throw errors.call_budget_used();
  }
  if (run.status === "failed") {
    throw cause === "call_budget_used"
      ? errors.call_budget_used()
      : errors.provider_unavailable();
  }
  return run;
});

/** `GET /refresh`: the last run, the next one, and the day's calls. */
export const refreshState = service.refreshState.handler(({ context }) =>
  context.pricing.refresh.state(),
);
