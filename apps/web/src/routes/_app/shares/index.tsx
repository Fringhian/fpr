import { createFileRoute } from "@tanstack/react-router";
import { validateSharesSearch } from "../../../lib/view-state/view-search";
import { SharesScreen } from "../-shares/shares-screen";

/** Shares' search: the search text. */
export const Route = createFileRoute("/_app/shares/")({
  validateSearch: validateSharesSearch,
  component: SharesScreen,
});
