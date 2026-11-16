import { createFileRoute } from "@tanstack/react-router";
import { validateNewShareSearch } from "../../../lib/new-share-search";
import { NewSharePage } from "../-new-share/new-share-page";

/** Create a manual share, opened from a lookup. */
export const Route = createFileRoute("/_focused/shares/new")({
  staticData: { access: "portfolio" },
  validateSearch: validateNewShareSearch,
  component: NewShare,
});

function NewShare() {
  return <NewSharePage search={Route.useSearch()} />;
}
