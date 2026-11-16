import type { LatestPrice, ShareSummary } from "@fpr/contracts";
import type { Share, ShareValue } from "@fpr/db";

export function toShareSummary(share: Share): ShareSummary {
  return {
    id: share.id,
    isin: share.isin,
    name: share.name,
    kind: share.kind,
    symbol: share.providerSymbol,
  };
}

export function toLatestPrice(
  value: ShareValue | undefined,
): LatestPrice | null {
  return value === undefined
    ? null
    : {
        at: value.at.toISOString(),
        priceEur: value.priceEur,
        source: value.source,
      };
}
