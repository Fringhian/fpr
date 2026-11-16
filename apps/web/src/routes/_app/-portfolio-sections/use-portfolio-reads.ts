import type { Id } from "@fpr/contracts";
import { useQuery } from "@tanstack/react-query";
import { liveViewFor } from "../../../lib/api/query-client";
import { useApi } from "../../../lib/api/use-api";
import { useViewState } from "../../../lib/view-state/use-view-state";

/**
 * A member's portfolio and their balance over the period, kept on screen
 * while another period or unit loads, never another member's.
 */
export function usePortfolioReads(userId: Id, enabled = true) {
  const api = useApi();
  const { setting } = useViewState();

  const input = { userId, period: setting.period };
  const view = liveViewFor(input, "userId");
  return {
    portfolio: useQuery(
      api.portfolio.get.queryOptions({ input, ...view, enabled }),
    ),
    history: useQuery(
      api.portfolio.balanceHistory.queryOptions({ input, ...view, enabled }),
    ),
  };
}
