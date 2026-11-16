import { createFileRoute } from "@tanstack/react-router";
import { validateSharesSearch } from "../../../lib/view-state/view-search";
import { ScreenPlaceholder } from "../../-shell/screen-placeholder";

/** Shares' search: the search text. */
export const Route = createFileRoute("/_app/shares/")({
  validateSearch: validateSharesSearch,
  component: () => <ScreenPlaceholder page="shares" period />,
});
