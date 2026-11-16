import { createFileRoute } from "@tanstack/react-router";
import { validateMemberSearch } from "../../../../lib/edit-portfolio";
import { MemberScreen } from "../../-member/member-screen";

export const Route = createFileRoute("/_app/members/$userId/")({
  validateSearch: validateMemberSearch,
  component: MemberScreen,
});
