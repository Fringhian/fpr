import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useSession } from "../../../lib/session/use-session";
import { LanguagePage } from "../-access/access-page";
import { type OnboardingStep, placeOf, searchOf } from "./steps";

/**
 * One onboarding step: Back to the step before, from the second step on, the
 * language switch, the progress over the role's steps, the step, and on
 * desktop `panel` on the sky.
 */
export function OnboardingPage({
  step,
  panel,
  children,
}: {
  step: OnboardingStep;
  panel: ReactNode;
  children: ReactNode;
}) {
  const { role } = useSession();

  const { progress, previous } = placeOf(role, step);

  return (
    <LanguagePage
      back={
        previous === undefined
          ? null
          : { render: <Link to="/onboarding" search={searchOf(previous)} /> }
      }
      progress={progress}
      panel={panel}
    >
      {children}
    </LanguagePage>
  );
}
