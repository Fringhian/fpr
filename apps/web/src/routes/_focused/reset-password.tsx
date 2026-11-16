import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CheckStep, type ResetPair } from "./-reset-password/check-step";
import { NewPasswordStep } from "./-reset-password/new-password-step";

export const Route = createFileRoute("/_focused/reset-password")({
  staticData: { access: "signedOut" },
  component: ResetPassword,
});

/**
 * A password reset in two steps. The checked pair stays in memory only: the
 * reset key is a secret, never written in the address.
 */
function ResetPassword() {
  const [pair, setPair] = useState<ResetPair | null>(null);
  const [checked, setChecked] = useState(false);

  return checked && pair !== null ? (
    <NewPasswordStep pair={pair} onBack={() => setChecked(false)} />
  ) : (
    <CheckStep
      pair={pair}
      onChecked={(entered) => {
        setPair(entered);
        setChecked(true);
      }}
    />
  );
}
