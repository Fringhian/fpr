import type { Id } from "@fpr/contracts";
import { useQuery } from "@tanstack/react-query";
import { liveViewFor } from "../../../lib/api/query-client";
import { useApi } from "../../../lib/api/use-api";
import { useViewState } from "../../../lib/view-state/use-view-state";

function usePortfolioInput(userId: Id) {
  const { setting } = useViewState();

  const input = { userId, period: setting.period };
  return { input, ...liveViewFor(input, "userId") };
}

/** A member's portfolio for the period, kept on screen while another period or unit loads, never another member's. */
export function usePortfolioRead(userId: Id, enabled = true) {
  const api = useApi();
  const options = usePortfolioInput(userId);

  return useQuery(api.portfolio.get.queryOptions({ ...options, enabled }));
}

/** A member's portfolio and their balance over the period, kept like `usePortfolioRead`'s. */
export function usePortfolioReads(userId: Id, enabled = true) {
  const api = useApi();
  const options = usePortfolioInput(userId);

  return {
    portfolio: usePortfolioRead(userId, enabled),
    history: useQuery(
      api.portfolio.balanceHistory.queryOptions({ ...options, enabled }),
    ),
  };
}
