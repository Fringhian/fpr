import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../-placeholder";

export const Route = createFileRoute("/_focused/reset-password")({
  staticData: { access: "signedOut" },
  component: () => <Placeholder page="resetPassword" />,
});
