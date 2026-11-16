import type { Id, Portfolio } from "@fpr/contracts";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useApi } from "../../../lib/api/use-api";
import { logRows } from "./log-rows";

/** Entries per page of the log: Portfolio's latest changes read the first. */
const PAGE_SIZE = 20;

/**
 * A member's log, newest first, a page at a time, as timeline rows once
 * their portfolio is known too: its holdings give each change its before →
 * after. Portfolio and History read the same first page.
 */
export function useLog(userId: Id, portfolio: Portfolio | undefined) {
  const api = useApi();
  const log = useInfiniteQuery(
    api.portfolio.log.infiniteOptions({
      input: (before: string | undefined) => ({
        userId,
        limit: PAGE_SIZE,
        before,
      }),
      initialPageParam: undefined,
      getNextPageParam: (page) => page.nextBefore ?? undefined,
    }),
  );

  const pages = log.data?.pages;
  const complete = !log.hasNextPage;
  const holdings = portfolio?.holdings;
  const rows = useMemo(
    () =>
      pages && holdings
        ? logRows(
            pages.flatMap((page) => page.entries),
            holdings,
            complete,
          )
        : undefined,
    [pages, holdings, complete],
  );
  return { log, rows };
}
