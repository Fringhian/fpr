import { useId } from "react";
import { useTranslation } from "react-i18next";
import { FormError } from "../../../components/molecules/form-error/form-error";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { useSession } from "../../../lib/session/use-session";
import { ColourPicker } from "./colour-picker";
import { LookPanel, LookTeaser, lookOf } from "./look-preview";
import { OnboardingPage } from "./onboarding-page";
import { PhotoControl } from "./photo-control";
import { placeOf, useGoToStep } from "./steps";
import { useColourChoice } from "./use-colour-choice";

/**
 * Step 2: the person's colour, the one they were given first, and a photo if
 * they want one. The picture and the lane follow each pick.
 */
export function LookStep() {
  const { t } = useTranslation();
  const { person, role } = useSession();
  const goToStep = useGoToStep();
  const questionId = useId();
  const saved = lookOf(person);
  const next =
    placeOf(role, "look").next === "portfolio" ? "portfolio" : "welcome";
  const choice = useColourChoice(saved.color, () => void goToStep(next));

  const look = { ...saved, color: choice.color };

  return (
    <OnboardingPage step="look" panel={<LookPanel look={look} />}>
      <StepFlow.Body>
        <StepFlow.Question id={questionId}>
          {t("onboarding.look.question")}
        </StepFlow.Question>
        <StepFlow.Description>
          {t("onboarding.look.description")}
        </StepFlow.Description>
        <PhotoControl look={look} />
        <ColourPicker
          value={choice.color}
          onValueChange={choice.setColor}
          taken={choice.taken}
          labelledBy={questionId}
        />
        <p className="text-s text-secondary">{t("onboarding.look.taken")}</p>
        <FormError>{choice.error}</FormError>
        <LookTeaser look={look} />
      </StepFlow.Body>
      <StepFlow.Actions>
        <StepFlow.MainButton
          next
          loading={choice.saving}
          loadingLabel={t("onboarding.saving")}
          onClick={choice.save}
        >
          {t(`onboarding.look.action.${next}`)}
        </StepFlow.MainButton>
      </StepFlow.Actions>
    </OnboardingPage>
  );
}
