import { ProhibitIcon } from "@phosphor-icons/react/Prohibit";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { StateIcon } from "../../../components/atoms/state-icon/state-icon";
import { TextLink } from "../../../components/atoms/text-link/text-link";
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
          <p className="text-s">
            <TextLink render={<Link to="/sign-in" />}>
              {t("pageStates.accessEnded.otherAccount")}
            </TextLink>
          </p>
        </StepFlow.Body>
      </StepFlow.Column>
    </StepFlow.Root>
  );
}
