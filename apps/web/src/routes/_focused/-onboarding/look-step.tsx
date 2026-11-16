import { useId } from "react";
import { useTranslation } from "react-i18next";
import { Picture } from "../../../components/atoms/picture/picture";
import { FormError } from "../../../components/molecules/form-error/form-error";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { cn } from "../../../lib/cn";
import { lookOf } from "../../../lib/look";
import { useSession } from "../../../lib/session/use-session";
import { ColourPicker } from "../../-account/colour-picker";
import { PhotoControl } from "../../-account/photo-control";
import { useColourChoice } from "../../-account/use-colour-choice";
import { LookPanel, LookTeaser } from "./look-preview";
import { OnboardingPage } from "./onboarding-page";
import { placeOf, useGoToStep } from "./steps";

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
        <PhotoControl
          hasPhoto={look.photo !== null}
          addLabel={t("onboarding.look.usePhoto")}
        >
          {/* The desktop shows the picture on the sky. */}
          <Picture
            name={look.name}
            color={look.color}
            photo={look.photo}
            size="l"
            aria-hidden
            className={cn("", "flex", "tablet:flex", "desktop:hidden")}
          />
        </PhotoControl>
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
          onClick={() => choice.save()}
        >
          {t(`onboarding.look.action.${next}`)}
        </StepFlow.MainButton>
      </StepFlow.Actions>
    </OnboardingPage>
  );
}
