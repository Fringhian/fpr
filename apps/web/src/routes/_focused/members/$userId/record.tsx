import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../../-placeholder";

/** The admin records a change for a member. */
export const Route = createFileRoute("/_focused/members/$userId/record")({
  staticData: { access: "admin" },
  component: () => <Placeholder page="memberRecord" />,
});
