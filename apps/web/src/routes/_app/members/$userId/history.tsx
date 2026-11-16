import { createFileRoute } from "@tanstack/react-router";
import { MemberHistoryScreen } from "../../-history/member-history-screen";

/** The admin's view of a member's every change, from their page in edit mode. */
export const Route = createFileRoute("/_app/members/$userId/history")({
  staticData: { access: "admin" },
  component: MemberHistory,
});

function MemberHistory() {
  const { userId } = Route.useParams();

  return <MemberHistoryScreen userId={userId} />;
}
