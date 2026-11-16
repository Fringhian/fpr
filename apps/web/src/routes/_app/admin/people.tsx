import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../-placeholder";

export const Route = createFileRoute("/_app/admin/people")({
  component: () => <Placeholder page="people" />,
});
