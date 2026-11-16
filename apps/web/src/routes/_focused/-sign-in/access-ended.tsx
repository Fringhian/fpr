import { ProhibitIcon } from "@phosphor-icons/react/Prohibit";
import { useTranslation } from "react-i18next";
import { StateIcon } from "../../../components/atoms/state-icon/state-icon";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";

/**
 * Sign-in after the API answered `access_ended`, mid-visit or on a sign-in:
 * the person's access is over, and only the admin can give it back.
 */
export function AccessEnded() {
  const { t } = useTranslation();

  return (
    <StepFlow.Root>
      <StepFlow.Column>
        <StepFlow.Header />
        <StepFlow.Body>
          <StateIcon icon={ProhibitIcon} />
          <StepFlow.Question>
            {t("pageStates.accessEnded.title")}
          </StepFlow.Question>
          <StepFlow.Description>
            {t("pageStates.accessEnded.description")}
          </StepFlow.Description>
        </StepFlow.Body>
      </StepFlow.Column>
    </StepFlow.Root>
  );
}
