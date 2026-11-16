import { createFileRoute } from "@tanstack/react-router";
import { ScreenPlaceholder } from "../../-shell/screen-placeholder";

export const Route = createFileRoute("/_app/admin/people")({
  component: () => <ScreenPlaceholder page="people" />,
});
