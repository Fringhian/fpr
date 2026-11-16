import { createFileRoute } from "@tanstack/react-router";
import { ScreenPlaceholder } from "../-shell/screen-placeholder";

export const Route = createFileRoute("/_app/help")({
  component: () => <ScreenPlaceholder page="help" />,
});
