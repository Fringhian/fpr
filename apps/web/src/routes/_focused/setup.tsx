import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../-placeholder";

export const Route = createFileRoute("/_focused/setup")({
  staticData: { access: "signedOut" },
  component: () => <Placeholder page="setup" />,
});
