import type { Id } from "@fpr/contracts";
import { useEffect } from "react";
import { type SavedEntry, savedEntryOf } from "../../../lib/log-entry";
import { useLogPages } from "../../_app/-portfolio-sections/use-log";

/**
 * The newest entry of `userId`'s log that `matches`, with its quantity and
 * cash, reading older pages until one does: `undefined` while it looks,
 * `null` once the log ends without one. The pages are Portfolio's and
 * History's, so an entry opened from them is already there.
 */
export function useLogFind(
  userId: Id,
  matches: (entry: SavedEntry) => boolean,
  enabled = true,
): {
  found: SavedEntry | null | undefined;
  failed: boolean;
  retry: () => void;
} {
  const log = useLogPages(userId, enabled);

  const entries = log.data?.pages.flatMap((page) =>
    page.entries.flatMap((entry) => savedEntryOf(entry) ?? []),
  );
  const match = entries?.find(matches);
  const more = log.hasNextPage && !log.isFetchingNextPage && !log.isError;
  const looking = match === undefined && more;

  useEffect(() => {
    if (looking) void log.fetchNextPage();
  }, [looking, log.fetchNextPage]);

  return {
    found:
      match ?? (entries === undefined || log.hasNextPage ? undefined : null),
    failed: log.isError,
    retry: () => void log.refetch(),
  };
}
