import type { Id } from "@fpr/contracts";
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { useApi } from "../../../lib/api/use-api";
import { logRows } from "./log-rows";

const PAGE_SIZE = 20;

/**
 * A member's log, newest first, a page at a time, as timeline rows: one
 * cache entry, whoever reads it. Portfolio and History read the same first
 * page. `total` is how many entries the whole log holds.
 */
export function useLog(userId: Id, enabled = true) {
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
      enabled,
    }),
  );

  const pages = log.data?.pages;
  const rows = useMemo(
    () =>
      pages &&
      logRows(
        pages.flatMap((page) => page.entries),
        userId,
      ),
    [pages, userId],
  );
  return { log, rows, total: pages?.[0]?.total };
}
