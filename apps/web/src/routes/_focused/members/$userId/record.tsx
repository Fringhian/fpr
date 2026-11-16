import { createFileRoute } from "@tanstack/react-router";
import { lookOf } from "../../../../lib/look";
import { useMembers } from "../../../../lib/members";
import { validateRecordSearch } from "../../../../lib/record-search";
import { useSession } from "../../../../lib/session/use-session";
import { DEFAULT_SETTING } from "../../../../lib/view-state/view-search";
import { LoadState } from "../../-record/load-state";
import { closeLink, RecordFlow } from "../../-record/record-flow";

/** The admin records a change for a member, with the member's own flow. */
export const Route = createFileRoute("/_focused/members/$userId/record")({
  staticData: { access: "admin" },
  validateSearch: validateRecordSearch,
  component: MemberRecord,
});

/** The member, from the members list, once it loads; not found when they aren't in it. */
function MemberRecord() {
  const { userId } = Route.useParams();
  const search = Route.useSearch();
  const { person } = useSession();
  const members = useMembers(DEFAULT_SETTING.period);

  const row = members.data?.members.find(({ member }) => member.id === userId);
  if (row === undefined) {
    const owner = { id: userId, own: false };
    return (
      <LoadState
        subject="member"
        state={
          members.isError ? "failed" : members.data ? "missing" : "loading"
        }
        onRetry={() => void members.refetch()}
        close={closeLink(owner, false)}
      />
    );
  }
  const look = lookOf(row.member);
  return (
    <RecordFlow
      owner={{
        id: userId,
        own: userId === person.id,
        name: look.name,
        color: look.color,
      }}
      search={search}
    />
  );
}
