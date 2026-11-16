import type { Id, Listing, Period, ShareSummary } from "@fpr/contracts";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useState } from "react";
import type * as ShareLookup from "../../components/organisms/share-lookup/share-lookup";
import { useErrorText } from "../../lib/api/errors";
import { useApi } from "../../lib/api/use-api";
import { isinIn } from "../../lib/isin";

/** The shares a text matched in FPR when it was looked up: what the lookup found besides is new. */
type Known = { subject: string; ids: ReadonlySet<Id> };

/**
 * Whether FPR already has the ISIN typed: the Shares search's own answer for
 * it, from the cache the list fills, so asking costs no other call.
 */
function useIsinInFpr(isin: string | null, period: Period, enabled: boolean) {
  const api = useApi();

  return useQuery({
    ...api.shares.search.queryOptions({ input: { q: isin ?? "", period } }),
    enabled: enabled && isin !== null,
    select: ({ shares }) => shares.some((share) => share.isin === isin),
  });
}

/**
 * Finding a share FPR doesn't know yet at the price provider, for `query`,
 * the Shares search's text: a full ISIN that isn't in FPR is looked up by
 * itself, any other text when `lookUp` is pressed. One lookup is one
 * provider call, and its answer belongs to the text it was made for.
 * `listed` are the shares FPR matched for the text: the lookup's `found`
 * are the others, which the list leaves to the lookup. `null` state while
 * there is nothing to offer, for a reader who can't look up, or no text.
 */
export function useShareLookup({
  query,
  period,
  listed,
  enabled,
}: {
  query: string;
  period: Period;
  listed: readonly { id: Id }[] | undefined;
  enabled: boolean;
}) {
  const api = useApi();
  const errorText = useErrorText();
  const lookup = useMutation(api.shares.lookup.mutationOptions());
  const listing = useMutation(api.shares.lookup.mutationOptions());
  const [known, setKnown] = useState<Known | null>(null);
  const isin = isinIn(query);
  const inFpr = useIsinInFpr(isin, period, enabled);

  const subject = isin ?? query;
  const lookUp = useEffectEvent(() => {
    setKnown({ subject, ids: new Set(listed?.map(({ id }) => id)) });
    listing.reset();
    lookup.mutate({ query: subject });
  });
  const lookedUp = lookup.variables?.query === subject;

  useEffect(() => {
    if (isin !== null && inFpr.data === false && !lookedUp) lookUp();
  }, [isin, inFpr.data, lookedUp]);

  const found =
    lookedUp && lookup.data
      ? lookup.data.shares.filter((share) => !known?.ids.has(share.id))
      : [];
  const state = stateOf({
    open: enabled && query !== "",
    waiting: isin !== null && inFpr.data !== false,
    lookedUp,
    pending: lookup.isPending,
    error: lookup.isError ? errorText(lookup.error) : null,
    found,
    listings: lookup.data?.listings ?? [],
    others: (known?.ids.size ?? 0) > 0,
  });

  return {
    state,
    /** The shares only the lookup shows, by id. */
    found: new Set(found.map(({ id }) => id)),
    lookUp: () => lookUp(),
    addListing: (
      { symbol }: Listing,
      typed: string,
      onAdded: (share: ShareSummary) => void,
    ) =>
      listing.mutate(
        { query: symbol, isin: typed },
        { onSuccess: ({ shares }) => shares[0] && onAdded(shares[0]) },
      ),
    listing,
  };
}

/** Where the lookup of the text stands, from what the hook knows of it. */
function stateOf({
  open,
  waiting,
  lookedUp,
  pending,
  error,
  found,
  listings,
  others,
}: {
  open: boolean;
  /** A full ISIN, until FPR is known not to have it. */
  waiting: boolean;
  lookedUp: boolean;
  pending: boolean;
  error: string | null;
  found: readonly ShareSummary[];
  listings: readonly Listing[];
  others: boolean;
}): ShareLookup.State | null {
  if (!open) return null;
  if (!lookedUp) return waiting ? null : { status: "offer" };
  if (pending) return { status: "looking" };
  if (error !== null) return { status: "failed", error };
  return found.length === 0 && listings.length === 0
    ? { status: "none", others }
    : { status: "found", shares: found, listings };
}
