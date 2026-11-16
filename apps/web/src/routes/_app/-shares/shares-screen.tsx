import { useLocation, useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import * as ShareSearch from "../../../components/organisms/share-search/share-search";
import { useErrorText } from "../../../lib/api/errors";
import {
  useSharesQuery,
  useViewState,
} from "../../../lib/view-state/use-view-state";
import { ShareLookupSection } from "../../-share-lookup/share-lookup-section";
import { useListedShares } from "../../-share-lookup/use-listed-shares";
import { Screen } from "../../-shell/screen";
import { ShareGroups } from "./share-groups";

/**
 * Shares: the search, its text in the address, then every share FPR knows
 * that matches it, held ones first. Typing filters FPR's own shares and
 * costs no provider call. A member or the admin can then look the text up
 * at the price provider, and add what it finds or create a manual share.
 */
export function SharesScreen() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const navigate = useNavigate();
  const { href } = useLocation();
  const { setting } = useViewState();
  const { q, query, setQ } = useSharesQuery();
  const { search, listed, lookup } = useListedShares(query, setting.period);

  const error = search.isError && listed === undefined;
  // Once the text is looked up, the lookup says what it found instead.
  const lookedUp = lookup.state !== null && lookup.state.status !== "offer";

  return (
    <Screen title={t("pages.shares")} period>
      <ShareSearch.Root className="gap-l pb-l">
        <ShareSearch.Input
          value={q}
          onValueChange={setQ}
          label={t("shareSearch.label")}
        />
        {listed === undefined || error || (listed.length === 0 && !lookedUp) ? (
          <ShareSearch.Status
            q={q}
            loading={listed === undefined}
            error={error ? errorText(search.error) : null}
            onRetry={() => void search.refetch()}
          />
        ) : listed.length > 0 ? (
          <ShareGroups shares={listed} unit={setting.unit} />
        ) : null}
        <ShareLookupSection
          lookup={lookup}
          query={query}
          back={href}
          onAdd={(share) =>
            void navigate({
              to: "/shares/$shareId",
              params: { shareId: share.id },
            })
          }
        />
      </ShareSearch.Root>
    </Screen>
  );
}
