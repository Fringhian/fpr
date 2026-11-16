import { createFileRoute } from "@tanstack/react-router";
import { MemberScreen } from "../../-member/member-screen";

export const Route = createFileRoute("/_app/members/$userId/")({
  component: MemberScreen,
});
