import type { Id } from "@fpr/contracts";
import { useQuery } from "@tanstack/react-query";
import { isApiError } from "../../../lib/api/errors";
import { neededReads } from "../../../lib/api/needed-reads";
import { livePrices, liveViewFor } from "../../../lib/api/query-client";
import { useApi } from "../../../lib/api/use-api";
import { useViewState } from "../../../lib/view-state/use-view-state";

/** A read of the share's own, kept on screen while another period loads, never another share's. */
function shareInput<Extra extends object>(id: Id, extra: Extra) {
  const input = { id, ...extra };
  return { input, ...liveViewFor(input, "id") };
}

/**
 * A share's page's reads: the share with its latest price, change over the
 * period and the viewer's position; its chart over the period; each member
 * with changes on it; and for a manual share, its values and their edits.
 * `missing` once the API says no share has this id.
 */
export function useShareData(shareId: Id) {
  const api = useApi();
  const { setting } = useViewState();
  const share = useQuery(
    api.shares.get.queryOptions(
      shareInput(shareId, { period: setting.period }),
    ),
  );
  const prices = useQuery(
    api.shares.prices.queryOptions(
      shareInput(shareId, { range: setting.period }),
    ),
  );
  const holders = useQuery(
    api.shares.holders.queryOptions({ input: { id: shareId }, ...livePrices }),
  );
  const manual = share.data?.kind === "manual";
  const values = useQuery(
    api.shares.values.queryOptions({
      input: { id: shareId },
      enabled: manual,
    }),
  );
  const events = useQuery(
    api.shares.valueEvents.queryOptions({
      input: { id: shareId },
      enabled: manual,
    }),
  );

  return {
    share: share.data,
    missing: isApiError(share.error, "not_found"),
    points: prices.data?.points,
    holders: holders.data?.holders,
    values: manual ? values.data?.values : undefined,
    events: manual ? events.data?.events : undefined,
    ...neededReads([share, prices, holders]),
  };
}

export type ShareData = ReturnType<typeof useShareData>;
