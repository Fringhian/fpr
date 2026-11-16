import type { ShareSummary } from "@fpr/contracts";
import { Link } from "@tanstack/react-router";
import * as ShareLookup from "../../components/organisms/share-lookup/share-lookup";
import { isinIn } from "../../lib/isin";
import type { NewShareSearch } from "../../lib/new-share-search";
import { useIsinRefusal } from "../-share-fields/use-isin-refusal";
import type { useShareLookup } from "./use-share-lookup";

/**
 * The lookup under the Shares search, on the Shares page and in Record a
 * change: `onAdd` opens or picks the share a lookup found or stored.
 * Create a manual share opens with the text's ISIN, Close leading back to
 * `back`, and with `pick`, the new share picked there.
 */
export function ShareLookupSection({
  lookup,
  query,
  onAdd,
  back,
  pick,
}: {
  lookup: ReturnType<typeof useShareLookup>;
  query: string;
  onAdd: (share: ShareSummary) => void;
} & Pick<NewShareSearch, "back" | "pick">) {
  const { listing, state } = lookup;
  const refusal = useIsinRefusal(listing.error);

  const search: NewShareSearch = {
    isin: isinIn(query) ?? undefined,
    back,
    pick,
  };

  return state === null ? null : (
    <ShareLookup.Basic
      query={query}
      state={state}
      onLookUp={lookup.lookUp}
      onAddShare={onAdd}
      onAddListing={(found, isin) => lookup.addListing(found, isin, onAdd)}
      adding={
        listing.variables && {
          symbol: listing.variables.query,
          adding: listing.isPending,
          error: refusal.text,
          takenLink: refusal.takenLink,
        }
      }
      createLink={<Link to="/shares/new" search={search} ignoreBlocker />}
    />
  );
}
