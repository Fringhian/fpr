import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../../-placeholder";

export const Route = createFileRoute("/_app/shares/")({
  component: () => <Placeholder page="shares" />,
});
