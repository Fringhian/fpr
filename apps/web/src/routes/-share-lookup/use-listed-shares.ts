import type { Period, ShareListItem } from "@fpr/contracts";
import { writerRoles } from "@fpr/contracts/values";
import { useSession } from "../../lib/session/use-session";
import { useShareSearch } from "../../lib/share-search";
import { useShareLookup } from "./use-share-lookup";

/**
 * The Shares search over `query`, on the Shares page and in Record a
 * change: FPR's shares matching it, `listed`, minus those only the lookup
 * shows, and the lookup at the price provider, which only a member or the
 * admin can use.
 */
export function useListedShares(query: string, period: Period) {
  const { role } = useSession();
  const search = useShareSearch(query, period);
  const shares = search.data?.shares;
  const lookup = useShareLookup({
    query: query.trim(),
    period,
    listed: shares,
    enabled: writerRoles.some((writer) => writer === role),
  });

  const listed: readonly ShareListItem[] | undefined = shares?.filter(
    (share) => !lookup.found.has(share.id),
  );
  return { search, listed, lookup };
}
