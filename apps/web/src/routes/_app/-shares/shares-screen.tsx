import { useTranslation } from "react-i18next";
import * as ShareSearch from "../../../components/organisms/share-search/share-search";
import { useErrorText } from "../../../lib/api/errors";
import { useShareSearch } from "../../../lib/share-search";
import {
  useSharesQuery,
  useViewState,
} from "../../../lib/view-state/use-view-state";
import { Screen } from "../../-shell/screen";
import { ShareGroups } from "./share-groups";

/**
 * Shares: the search, its text in the address, then every share FPR knows
 * that matches it, held ones first. Typing filters FPR's own shares and
 * costs no provider call.
 */
export function SharesScreen() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const { setting } = useViewState();
  const { q, query, setQ } = useSharesQuery();
  const search = useShareSearch(query, setting.period);

  const shares = search.data?.shares;
  const error = search.isError && shares === undefined;

  return (
    <Screen title={t("pages.shares")} period>
      <ShareSearch.Root className="gap-l pb-l">
        <ShareSearch.Input
          value={q}
          onValueChange={setQ}
          label={t("shareSearch.label")}
        />
        {shares === undefined || shares.length === 0 || error ? (
          <ShareSearch.Status
            q={q}
            loading={shares === undefined}
            error={error ? errorText(search.error) : null}
            onRetry={() => void search.refetch()}
          />
        ) : (
          <ShareGroups shares={shares} unit={setting.unit} />
        )}
      </ShareSearch.Root>
    </Screen>
  );
}
