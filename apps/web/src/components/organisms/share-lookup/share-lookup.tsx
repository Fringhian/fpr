// The lookup's parts, imported as a namespace: `import * as ShareLookup from "…/share-lookup"`.
import type { Listing, ShareSummary } from "@fpr/contracts";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/MagnifyingGlass";
import { WifiSlashIcon } from "@phosphor-icons/react/WifiSlash";
import type { ComponentProps, ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "../../../lib/cn";
import { quote } from "../../../lib/format/text";
import { useLanguage } from "../../../lib/i18n";
import { Button } from "../../atoms/button/button";
import { Card } from "../../atoms/card/card";
import { LoadingPlaceholder } from "../../atoms/loading-placeholder/loading-placeholder";
import { StateIcon } from "../../atoms/state-icon/state-icon";
import { TextLink } from "../../atoms/text-link/text-link";
import {
  Found,
  FoundListing,
  type FoundListingProps,
  FoundShare,
} from "./share-lookup-found";

export {
  Found,
  FoundListing,
  type FoundListingProps,
  FoundShare,
} from "./share-lookup-found";

/** Under the shares found: “Not here?” and the button that looks the text up at the price provider. */
export function Offer({
  query,
  onLookUp,
  className,
  ...props
}: { query: string; onLookUp: () => void } & Omit<
  ComponentProps<"p">,
  "children"
>) {
  const { t } = useTranslation();
  const language = useLanguage();

  return (
    <p
      {...props}
      className={cn(
        "max-w-[35rem] rounded-m border-[0.09375rem] border-dashed border-divider px-m py-s text-s text-secondary",
        className,
      )}
    >
      {t("shareLookup.notHere")}{" "}
      <TextLink
        render={<button type="button" onClick={onLookUp} />}
        className="cursor-pointer text-left"
      >
        {t("shareLookup.lookUp", { q: quote(query, language) })}
      </TextLink>
    </p>
  );
}

/** While the provider answers. */
export function Looking({ query }: { query: string }) {
  const { t } = useTranslation();
  const language = useLanguage();

  return (
    <LoadingPlaceholder className="min-h-[4rem]">
      {t("shareLookup.looking", { q: quote(query, language) })}
    </LoadingPlaceholder>
  );
}

/**
 * The lookup found nothing new, or couldn't ask: what happened, what to do,
 * and Create a manual share, the main action when nothing was found. Its
 * `title` is the card's heading.
 */
export function Missing({
  failed,
  title,
  description,
  createLink,
  className,
  ...props
}: {
  /** The provider couldn't be asked, rather than found nothing. */
  failed: boolean;
  title: string;
  description: string;
  /** Create a manual share's page, as the router's link. */
  createLink: ReactElement;
} & Omit<ComponentProps<"section">, "title" | "children">) {
  const { t } = useTranslation();

  return (
    <Card
      {...props}
      render={<section />}
      className={cn(
        "grid max-w-[35rem] justify-items-start gap-s bg-highlight p-m shadow-none",
        className,
      )}
    >
      <StateIcon
        icon={failed ? WifiSlashIcon : MagnifyingGlassIcon}
        size="m"
        className="bg-surface"
      />
      <div role="status" className="grid gap-s">
        <h2 className="text-m font-semibold">{title}</h2>
        <p className="text-s text-secondary">{description}</p>
      </div>
      <Button
        intent={failed ? "secondary" : "primary"}
        size="wide"
        render={createLink}
        nativeButton={false}
        className="mt-xs"
      >
        {t("shareLookup.create")}
      </Button>
    </Card>
  );
}

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
  onAddShare,
  onAddListing,
  adding,
  createLink,
}: BasicProps) {
  const { t } = useTranslation();
  const language = useLanguage();

  const q = quote(query, language);
  switch (state.status) {
    case "offer":
      return <Offer query={query} onLookUp={onLookUp} />;
    case "looking":
      return <Looking query={query} />;
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
    case "found":
      return (
        <Found>
          {state.shares.map((share) => (
            <FoundShare key={share.id} share={share} onAdd={onAddShare} />
          ))}
          {state.listings.map((listing) => (
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
}
