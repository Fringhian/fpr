import type { Person } from "@fpr/contracts";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { FormError } from "../../../components/molecules/form-error/form-error";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { useApi } from "../../../lib/api/use-api";
import { cn } from "../../../lib/cn";
import { formatList } from "../../../lib/format/text";
import { useLanguage } from "../../../lib/i18n";
import { useSession } from "../../../lib/session/use-session";
import { useRefusal } from "../-access/use-refusal";
import { lookOf } from "./look-preview";
import { OnboardingPage } from "./onboarding-page";
import { useOthers } from "./use-others";
import { WelcomeCrowd } from "./welcome-crowd";

const NAMED = 3;

/** “Sam, Lea, Max and 3 others are already here.”, or that the person is the first. */
function useOthersSentence(others: readonly Person[]): string {
  const { t } = useTranslation();
  const language = useLanguage();

  if (others.length === 0) {
    return t("onboarding.welcome.first");
  }
  const names = others.slice(0, NAMED).map((other) => other.displayName);
  const rest = others.length - names.length;
  const list = formatList(
    rest > 0
      ? [...names, t("onboarding.welcome.more", { count: rest })]
      : names,
    language,
  );
  return t("onboarding.welcome.others", { count: others.length, names: list });
}

/** Marks onboarding finished, then opens Home, which the guards now let the person into. */
function useFinish() {
  const api = useApi();
  const navigate = useNavigate();
  const { formError, refuse, refuseError } = useRefusal();
  const finish = useMutation(api.me.update.mutationOptions());

  return {
    error: formError,
    finishing: finish.isPending,
    finish: () => {
      refuse(null);
      finish.mutate(
        { onboarded: true },
        {
          onSuccess: () => navigate({ to: "/", replace: true }),
          onError: refuseError,
        },
      );
    },
  };
}

/** The last step: the person among everyone already there, then Go to Home. */
export function WelcomeStep() {
  const { t } = useTranslation();
  const { person } = useSession();
  const { others } = useOthers();
  const sentence = useOthersSentence(others);
  const { error, finishing, finish } = useFinish();

  const look = lookOf(person);

  return (
    <OnboardingPage
      step="welcome"
      panel={
        <WelcomeCrowd look={look} others={others} className="max-w-[27.5rem]" />
      }
    >
      <StepFlow.Body
        className={cn(
          "",
          "items-center text-center",
          "tablet:items-center tablet:text-center",
          "desktop:items-stretch desktop:text-start",
        )}
      >
        <WelcomeCrowd
          look={look}
          others={others}
          className={cn(
            "max-w-[15rem]",
            "block",
            "tablet:block",
            "desktop:hidden",
          )}
        />
        <StepFlow.Question>
          {t("onboarding.welcome.question", { name: person.displayName })}
        </StepFlow.Question>
        <StepFlow.Description>{sentence}</StepFlow.Description>
        <FormError>{error}</FormError>
      </StepFlow.Body>
      <StepFlow.Actions>
        <StepFlow.MainButton
          loading={finishing}
          loadingLabel={t("onboarding.saving")}
          onClick={finish}
        >
          {t("onboarding.welcome.action")}
        </StepFlow.MainButton>
      </StepFlow.Actions>
    </OnboardingPage>
  );
}
