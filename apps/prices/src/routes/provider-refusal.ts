import { RatesError } from "../market/rates.js";
import { ProviderError } from "../providers/index.js";

/**
 * A provider or rates failure as the route's refusal: `call_budget_used` for
 * the day's cap or the calls the schedule keeps, `provider_unavailable` for
 * any other. Any other error is returned as it is.
 */
export function providerRefusal(
  error: unknown,
  errors: { call_budget_used(): Error; provider_unavailable(): Error },
): unknown {
  if (error instanceof ProviderError && error.reason === "call_budget_used") {
    return errors.call_budget_used();
  }
  if (error instanceof ProviderError || error instanceof RatesError) {
    return errors.provider_unavailable();
  }
  return error;
}
