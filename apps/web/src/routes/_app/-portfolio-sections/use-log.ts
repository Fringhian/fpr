import type { Id, Portfolio } from "@fpr/contracts";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useApi } from "../../../lib/api/use-api";
import { logRows } from "./log-rows";

const PAGE_SIZE = 20;

/** A member's log, newest first, a page at a time: one cache entry, whoever reads it. */
export function useLogPages(userId: Id, enabled = true) {
  const api = useApi();

  return useInfiniteQuery(
    api.portfolio.log.infiniteOptions({
      input: (before: string | undefined) => ({
        userId,
        limit: PAGE_SIZE,
        before,
      }),
      initialPageParam: undefined,
      getNextPageParam: (page) => page.nextBefore ?? undefined,
      enabled,
    }),
  );
}

/**
 * A member's log, newest first, a page at a time, as timeline rows once
 * their portfolio is known too: its holdings give each change its before →
 * after. Portfolio and History read the same first page, which also gives
 * the moment of the latest cash balance.
 */
export function useLog(
  userId: Id,
  portfolio: Portfolio | undefined,
  enabled = true,
) {
  const log = useLogPages(userId, enabled);

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
  const cash = pages
    ?.flatMap((page) => page.entries)
    .find((entry) => entry.type === "cash");
  return { log, rows, cashSetAt: cash?.effectiveAt };
}
