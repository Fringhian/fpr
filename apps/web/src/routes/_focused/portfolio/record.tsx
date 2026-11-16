import { createFileRoute } from "@tanstack/react-router";
import { lookOf } from "../../../lib/look";
import { validateRecordSearch } from "../../../lib/record-search";
import { useSession } from "../../../lib/session/use-session";
import { RecordFlow } from "../-record/record-flow";

/** Record a change in the viewer's own portfolio. */
export const Route = createFileRoute("/_focused/portfolio/record")({
  staticData: { access: "portfolio" },
  validateSearch: validateRecordSearch,
  component: OwnRecord,
});

function OwnRecord() {
  const { person } = useSession();
  const search = Route.useSearch();

  return (
    <RecordFlow
      owner={{
        id: person.id,
        own: true,
        name: person.displayName,
        color: lookOf(person).color,
      }}
      search={search}
    />
  );
}
