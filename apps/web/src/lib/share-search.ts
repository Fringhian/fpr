import type { Period } from "@fpr/contracts";
import { useQuery } from "@tanstack/react-query";
import { useDeferredValue } from "react";
import { liveView } from "./api/query-client";
import { useApi } from "./api/use-api";
import { isinIn } from "./isin";

/** The text the Shares search sends: an ISIN as the API takes it, any other text trimmed. */
export function searchTextOf(text: string): string {
  const trimmed = text.trim();
  return isinIn(trimmed) ?? trimmed;
}

/**
 * FPR's shares matching `query` over `period`, held ones first: the Shares
 * search, on `/shares` and in Record a change. Typing costs no provider
 * call. The last matches stay on screen while the next ones load, and a
 * fast typist's keystrokes don't each wait for an answer. `current` once
 * the matches shown are the text's own, not the last text's.
 */
export function useShareSearch(query: string, period: Period) {
  const api = useApi();
  const text = searchTextOf(query);
  const q = useDeferredValue(text);

  const search = useQuery(
    api.shares.search.queryOptions({ input: { q, period }, ...liveView }),
  );
  return {
    search,
    current:
      q === text && search.data !== undefined && !search.isPlaceholderData,
  };
}
