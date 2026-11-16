import { createFileRoute } from "@tanstack/react-router";
import { MembersScreen } from "../-members/members-screen";

export const Route = createFileRoute("/_app/members/")({
  component: MembersScreen,
});
