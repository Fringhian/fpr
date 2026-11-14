import type { Logger } from "pino";
import { createEodhdProvider } from "./eodhd.js";
import type { Fetch } from "./http.js";
import type { PriceProvider, ProviderName } from "./provider.js";

export {
  type PriceProvider,
  type ProviderClose,
  ProviderError,
  type ProviderErrorReason,
  type ProviderListing,
  type ProviderName,
  type ProviderQuote,
  providerNames,
} from "./provider.js";

export interface CreateProviderOptions {
  /** `PRICE_PROVIDER`. */
  name: ProviderName;
  /** `PRICE_PROVIDER_API_KEY`. */
  apiKey: string;
  logger: Logger;
  /** Defaults to the global `fetch`. */
  fetch?: Fetch;
}

const factories: Record<
  ProviderName,
  (options: Omit<CreateProviderOptions, "name">) => PriceProvider
> = {
  eodhd: createEodhdProvider,
};

/** The implementation `PRICE_PROVIDER` names, keyed by `PRICE_PROVIDER_API_KEY`. */
export function createProvider({
  name,
  ...options
}: CreateProviderOptions): PriceProvider {
  return factories[name](options);
}
