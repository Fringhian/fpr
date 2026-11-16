import type { Period } from "@fpr/contracts";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue } from "react";
import { liveView } from "./api/query-client";
import { useApi } from "./api/use-api";

/**
 * FPR's shares matching `query` over `period`, held ones first: the Shares
 * search, on `/shares` and in Record a change. Typing costs no provider
 * call. The last matches stay on screen while the next ones load, and a
 * fast typist's keystrokes don't each wait for an answer.
 */
export function useShareSearch(query: string, period: Period) {
  const api = useApi();
  const q = useDeferredValue(query.trim());

  return useQuery(
    api.shares.search.queryOptions({ input: { q, period }, ...liveView }),
  );
}
