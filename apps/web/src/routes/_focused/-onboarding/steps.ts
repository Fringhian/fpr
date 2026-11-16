import type { Role } from "@fpr/contracts";
import { useNavigate } from "@tanstack/react-router";
import { useCallback } from "react";

const allSteps = ["name", "look", "portfolio", "welcome"] as const;

export type OnboardingStep = (typeof allSteps)[number];

/** The step an address names, or the first one. */
export function stepIn(value: unknown): OnboardingStep {
  return allSteps.find((step) => step === value) ?? "name";
}

/** The steps a role goes through: a guest has no portfolio, so no portfolio step. */
export function stepsOf(role: Role): readonly OnboardingStep[] {
  return role === "guest"
    ? allSteps.filter((step) => step !== "portfolio")
    : allSteps;
}

/**
 * Where `step` stands in the role's steps: its place from 1, the count, and
 * the steps before and after it. A step the role skips stands as the first.
 */
export function placeOf(role: Role, step: OnboardingStep) {
  const steps = stepsOf(role);
  const index = Math.max(steps.indexOf(step), 0);

  return {
    step: steps[index] ?? "name",
    progress: { step: index + 1, count: steps.length },
    previous: steps[index - 1],
    next: steps[index + 1],
  };
}

/** The onboarding address's search for `step`: the first step has none. */
export function searchOf(step: OnboardingStep): {
  step?: Exclude<OnboardingStep, "name"> | undefined;
} {
  return { step: step === "name" ? undefined : step };
}

/** Opens a step, as a new entry of the history, so the browser's Back returns to the one before. */
export function useGoToStep(): (step: OnboardingStep) => Promise<void> {
  const navigate = useNavigate();

  return useCallback(
    (step) => navigate({ to: "/onboarding", search: searchOf(step) }),
    [navigate],
  );
}
