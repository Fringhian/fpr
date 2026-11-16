import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { InvitedStep } from "./-access-link/invited-step";
import { LinkStatePage } from "./-access-link/link-state";
import { type LinkState, openAccessLink } from "./-access-link/open-link";
import { PasswordStep } from "./-access-link/password-step";

export const Route = createFileRoute("/_focused/access/")({
  staticData: { access: "signedOut" },
  loader: ({ context }) => openAccessLink(context),
  component: AccessLink,
});

/**
 * The access link once opened: a password user's first use in two steps,
 * who it is for then the password, or where the link stops.
 */
function AccessLink() {
  const link = Route.useLoaderData();
  const [step, setStep] = useState<1 | 2>(1);
  const [refused, setRefused] = useState<LinkState | null>(null);

  if (refused !== null) {
    return <LinkStatePage state={refused} />;
  }
  if (link.state !== "invited") {
    return <LinkStatePage state={link.state} />;
  }
  return step === 1 ? (
    <InvitedStep
      email={link.email}
      displayName={link.displayName}
      onNext={() => setStep(2)}
    />
  ) : (
    <PasswordStep
      accessKey={link.key}
      email={link.email}
      onBack={() => setStep(1)}
      onRefused={setRefused}
    />
  );
}
