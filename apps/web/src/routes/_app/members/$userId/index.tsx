import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../../-placeholder";

export const Route = createFileRoute("/_app/members/$userId/")({
  component: () => <Placeholder page="member" />,
});
