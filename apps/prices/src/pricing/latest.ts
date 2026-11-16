import {
  type PriceProvider,
  ProviderError,
  type ProviderErrorReason,
} from "../providers/index.js";
import type { PricedShare } from "./deps.js";
import type { FetchedPrices } from "./store.js";

export interface FetchedLatest {
  quotes: FetchedPrices["quotes"];
  /** The shares of the failed batch and of every batch after it. */
  failed: Set<string>;
  cause: ProviderErrorReason | undefined;
}

/**
 * The latest price of each share, in batches of the provider's size, one
 * after another. A failed batch stops the rest, so they are not billed. A
 * share with no latest price, such as a fund, gets none and is no failure.
 */
export async function fetchLatest(
  provider: PriceProvider,
  priced: readonly PricedShare[],
): Promise<FetchedLatest> {
  const bySymbol = new Map(
    priced.map((share) => [share.providerSymbol, share]),
  );
  const symbols = [...bySymbol.keys()];
  const result: FetchedLatest = {
    quotes: [],
    failed: new Set(),
    cause: undefined,
  };
  for (
    let start = 0;
    start < symbols.length;
    start += provider.latestBatchSize
  ) {
    const batch = symbols.slice(start, start + provider.latestBatchSize);
    try {
      for (const quote of await provider.latest(batch)) {
        const share = bySymbol.get(quote.symbol);
        if (share !== undefined) {
          result.quotes.push({ share, quote });
        }
      }
    } catch (error) {
      if (!(error instanceof ProviderError)) {
        throw error;
      }
      for (const symbol of symbols.slice(start)) {
        const share = bySymbol.get(symbol);
        if (share !== undefined) {
          result.failed.add(share.id);
        }
      }
      result.cause = error.reason;
      break;
    }
  }
  return result;
}
