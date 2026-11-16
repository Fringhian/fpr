import { createFileRoute } from "@tanstack/react-router";
import { HelpScreen } from "./-help/help-screen";

export const Route = createFileRoute("/_app/help")({
  component: HelpScreen,
});
