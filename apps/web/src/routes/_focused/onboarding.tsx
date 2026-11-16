import { createFileRoute } from "@tanstack/react-router";
import { useSession } from "../../lib/session/use-session";
import { LookStep } from "./-onboarding/look-step";
import { NameStep } from "./-onboarding/name-step";
import { PortfolioStep } from "./-onboarding/portfolio-step";
import { placeOf, stepIn } from "./-onboarding/steps";
import { WelcomeStep } from "./-onboarding/welcome-step";

const screens = {
  name: NameStep,
  look: LookStep,
  portfolio: PortfolioStep,
  welcome: WelcomeStep,
};

/**
 * Onboarding, one step per screen, the step in `?step=` so the browser's
 * Back returns to the one before. The address without it opens the first
 * step, so onboarding left midway starts again there, with each step's
 * choice already saved. A step the role skips opens the first one.
 */
export const Route = createFileRoute("/_focused/onboarding")({
  staticData: { access: "onboarding" },
  validateSearch: (
    search,
  ): { step?: "look" | "portfolio" | "welcome" | undefined } => {
    const step = stepIn(search.step);
    return { step: step === "name" ? undefined : step };
  },
  component: Onboarding,
});

function Onboarding() {
  const { role } = useSession();
  const { step } = Route.useSearch();

  const Screen = screens[placeOf(role, step ?? "name").step];

  return <Screen />;
}
