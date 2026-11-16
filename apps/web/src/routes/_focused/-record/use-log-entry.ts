import type { Id, PortfolioLogEntry } from "@fpr/contracts";
import { useQuery } from "@tanstack/react-query";
import { isApiError } from "../../../lib/api/errors";
import { useApi } from "../../../lib/api/use-api";

/**
 * The entry `entryId` of `userId`'s log, to edit: `undefined` while it loads
 * or with no `entryId`, `null` once the API answers it isn't theirs or no
 * longer exists.
 */
export function useLogEntry(
  userId: Id,
  entryId: Id | undefined,
): {
  found: PortfolioLogEntry | null | undefined;
  failed: boolean;
  retry: () => void;
} {
  const api = useApi();
  const entry = useQuery(
    api.portfolio.logEntry.queryOptions({
      input: { userId, entryId: entryId ?? "" },
      enabled: entryId !== undefined,
    }),
  );

  const missing = isApiError(entry.error, "not_found");
  return {
    found: missing ? null : entry.data,
    failed: entry.isError && !missing,
    retry: () => void entry.refetch(),
  };
}
