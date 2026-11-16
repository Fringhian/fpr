// The lookup's parts, imported as a namespace: `import * as ShareLookup from "…/share-lookup"`.
import type { Listing, ShareSummary } from "@fpr/contracts";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { quote } from "../../../lib/format/text";
import { useLanguage } from "../../../lib/i18n";
import {
  Found,
  FoundListing,
  type FoundListingProps,
  FoundShare,
} from "./share-lookup-found";
import { Looking, Missing, Offer } from "./share-lookup-states";

export {
  Found,
  FoundListing,
  type FoundListingProps,
  FoundShare,
} from "./share-lookup-found";
export { Looking, Missing, Offer } from "./share-lookup-states";

/** Where the lookup of the text typed stands. */
export type State =
  | { status: "offer" }
  | { status: "looking" }
  | {
      status: "found";
      shares: readonly ShareSummary[];
      listings: readonly Listing[];
    }
  /** Nothing new: `others` when FPR's own shares matched the text. */
  | { status: "none"; others: boolean }
  /** `error`: why, written out. */
  | { status: "failed"; error: string };

export type BasicProps = {
  /** The text looked up, trimmed. */
  query: string;
  state: State;
  onLookUp: () => void;
  /** Opens a share the lookup found, or picks it. */
  onAddShare: (share: ShareSummary) => void;
  /** Stores a listing without an ISIN under the ISIN typed. */
  onAddListing: (listing: Listing, isin: string) => void;
  /** The listing being stored, by symbol, with the API's refusal of its ISIN. */
  adding?:
    | ({ symbol: string } & Pick<
        FoundListingProps,
        "adding" | "error" | "takenLink"
      >)
    | null
    | undefined;
  /** Create a manual share's page, as the router's link, its ISIN filled in when the text is one. */
  createLink: ReactElement;
};

/** The shares and listings found, the one being stored with its state. */
function FoundList({
  shares,
  listings,
  onAddShare,
  onAddListing,
  adding,
}: Extract<State, { status: "found" }> &
  Pick<BasicProps, "onAddShare" | "onAddListing" | "adding">) {
  return (
    <Found>
      {shares.map((share) => (
        <FoundShare key={share.id} share={share} onAdd={onAddShare} />
      ))}
      {listings.map((listing) => (
        <FoundListing
          key={listing.symbol}
          listing={listing}
          onAdd={(isin) => onAddListing(listing, isin)}
          {...(adding?.symbol === listing.symbol
            ? {
                adding: adding.adding,
                error: adding.error,
                takenLink: adding.takenLink,
              }
            : {})}
        />
      ))}
    </Found>
  );
}

/**
 * Finding a share FPR doesn't know yet, at the price provider: the offer to
 * look the text up, the lookup under way, what it found, each with Add, a
 * listing without an ISIN asking for one; or that it found nothing or
 * couldn't ask, with Create a manual share.
 */
export function Basic({
  query,
  state,
  onLookUp,
  createLink,
  ...found
}: BasicProps) {
  const { t } = useTranslation();
  const language = useLanguage();

  const q = quote(query, language);
  switch (state.status) {
    case "offer":
      return <Offer query={query} onLookUp={onLookUp} />;
    case "looking":
      return <Looking query={query} />;
    case "found":
      return <FoundList {...state} {...found} />;
    case "none":
      return (
        <Missing
          failed={false}
          title={t(
            state.others ? "shareLookup.noneOther" : "shareLookup.none",
            { q },
          )}
          description={t(
            state.others ? "shareLookup.noneOtherHelp" : "shareLookup.noneHelp",
          )}
          createLink={createLink}
        />
      );
    case "failed":
      return (
        <Missing
          failed
          title={t("shareLookup.failed")}
          description={`${state.error} ${t("shareLookup.failedHelp")}`}
          createLink={createLink}
        />
      );
  }
}
