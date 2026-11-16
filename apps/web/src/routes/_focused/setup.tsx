import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SetupClosed } from "./-setup/setup-closed";
import { SetupForm } from "./-setup/setup-form";

/**
 * The first-admin setup. Whether an admin exists is read once, as the page
 * loads, so the setup's own success, which creates one, never closes the
 * page under the person on their way to onboarding.
 */
export const Route = createFileRoute("/_focused/setup")({
  staticData: { access: "signedOut" },
  loader: ({ context }) =>
    context.queryClient.fetchQuery(
      context.api.access.setupStatus.queryOptions(),
    ),
  component: Setup,
});

function Setup() {
  const { adminExists } = Route.useLoaderData();
  const [closed, setClosed] = useState(adminExists);

  return closed ? (
    <SetupClosed />
  ) : (
    <SetupForm onClosed={() => setClosed(true)} />
  );
}
