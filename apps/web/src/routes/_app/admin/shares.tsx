import { createFileRoute } from "@tanstack/react-router";
import { ScreenPlaceholder } from "../../-shell/screen-placeholder";

export const Route = createFileRoute("/_app/admin/shares")({
  component: () => <ScreenPlaceholder page="trackedShares" />,
});
