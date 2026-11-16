import type { Period, ShareListItem } from "@fpr/contracts";
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
  const { writer } = useSession();
  const { search, current } = useShareSearch(query, period);
  const shares = search.data?.shares;
  const lookup = useShareLookup({
    query: query.trim(),
    listed: current ? shares : undefined,
    enabled: writer,
  });

  const listed: readonly ShareListItem[] | undefined = shares?.filter(
    (share) => !lookup.found.has(share.id),
  );
  return { search, listed, lookup };
}
