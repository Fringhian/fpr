import type { Id, Listing, ShareSummary } from "@fpr/contracts";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useEffectEvent, useState } from "react";
import type * as ShareLookup from "../../components/organisms/share-lookup/share-lookup";
import { useErrorText } from "../../lib/api/errors";
import { useApi } from "../../lib/api/use-api";
import { isinIn } from "../../lib/isin";

/**
 * Finding a share FPR doesn't know yet at the price provider, for `query`,
 * the Shares search's text: a full ISIN that isn't in FPR is looked up by
 * itself, any other text when `lookUp` is pressed. One lookup is one
 * provider call, and its answer belongs to the text it was made for.
 * `listed` are the shares FPR matched for the text, `undefined` until the
 * search has answered for this very text: the lookup waits for them, and
 * its `found` are the others, which the list leaves to the lookup. `null`
 * state while there is nothing to offer, for a reader who can't look up,
 * or no text.
 */
export function useShareLookup({
  query,
  listed,
  enabled,
}: {
  query: string;
  listed: readonly { id: Id; isin: string }[] | undefined;
  enabled: boolean;
}) {
  const api = useApi();
  const errorText = useErrorText();
  const lookup = useMutation(api.shares.lookup.mutationOptions());
  const listing = useMutation(api.shares.lookup.mutationOptions());
  // The shares FPR matched when the text was looked up: what the lookup found besides is new.
  const [known, setKnown] = useState<ReadonlySet<Id>>(new Set());
  // The text whose lookup was pressed before its matches arrived.
  const [asked, setAsked] = useState<string | null>(null);
  const isin = isinIn(query);

  const subject = isin ?? query;
  const inFpr = isin !== null && listed?.some((share) => share.isin === isin);
  const lookedUp = lookup.variables?.query === subject;
  const wanted =
    enabled && (asked === subject || (isin !== null && inFpr === false));
  const run = useEffectEvent(() => {
    setAsked(null);
    setKnown(new Set(listed?.map(({ id }) => id)));
    listing.reset();
    lookup.mutate({ query: subject });
  });

  useEffect(() => {
    if (wanted && listed !== undefined && !lookedUp) run();
  }, [wanted, listed, lookedUp]);

  const found =
    lookedUp && lookup.data
      ? lookup.data.shares.filter((share) => !known.has(share.id))
      : [];
  const state = stateOf({
    open: enabled && query !== "",
    waiting: isin !== null && inFpr !== false,
    lookedUp: lookedUp || wanted,
    pending: lookup.isPending || !lookedUp,
    error: lookup.isError ? errorText(lookup.error) : null,
    found,
    listings: lookup.data?.listings ?? [],
    others: known.size > 0,
  });

  return {
    state,
    /** The shares only the lookup shows, by id. */
    found: new Set(found.map(({ id }) => id)),
    /** Looks the text up once its matches are known, again after a failure. */
    lookUp: () => {
      lookup.reset();
      setAsked(subject);
    },
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
