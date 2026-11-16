import { createFileRoute } from "@tanstack/react-router";
import { Placeholder } from "../-placeholder";

export const Route = createFileRoute("/_focused/onboarding")({
  staticData: { access: "onboarding" },
  component: () => <Placeholder page="onboarding" />,
});
