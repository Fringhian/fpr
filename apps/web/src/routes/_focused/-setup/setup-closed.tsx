import { CheckCircleIcon } from "@phosphor-icons/react/CheckCircle";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { StateIcon } from "../../../components/atoms/state-icon/state-icon";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";

/** `/setup` once an admin exists, whatever the key: the way is sign-in. */
export function SetupClosed() {
  const { t } = useTranslation();

  return (
    <StepFlow.Root>
      <StepFlow.Column>
        <StepFlow.Header />
        <StepFlow.Body>
          <StateIcon icon={CheckCircleIcon} />
          <StepFlow.Question>{t("setup.closedTitle")}</StepFlow.Question>
          <StepFlow.Description>
            {t("setup.closedDescription")}
          </StepFlow.Description>
        </StepFlow.Body>
        <StepFlow.Actions>
          <StepFlow.MainButton
            nativeButton={false}
            render={<Link to="/sign-in" />}
          >
            {t("setup.closedAction")}
          </StepFlow.MainButton>
        </StepFlow.Actions>
      </StepFlow.Column>
    </StepFlow.Root>
  );
}
