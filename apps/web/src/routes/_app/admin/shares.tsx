import { createFileRoute } from "@tanstack/react-router";
import { SharesScreen } from "./-shares/shares-screen";

export const Route = createFileRoute("/_app/admin/shares")({
  component: SharesScreen,
});
