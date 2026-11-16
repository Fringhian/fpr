import { createFileRoute } from "@tanstack/react-router";
import { ScreenPlaceholder } from "../../../-shell/screen-placeholder";

export const Route = createFileRoute("/_app/members/$userId/")({
  component: () => <ScreenPlaceholder page="member" back="members" period />,
});
