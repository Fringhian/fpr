import { useTranslation } from "react-i18next";
import { Card } from "../../../components/atoms/card/card";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { AccessPage } from "../-access/access-page";

/** First use, step 1: who the link is for, by the name and email the admin entered. */
export function InvitedStep({
  email,
  displayName,
  onNext,
}: {
  email: string;
  displayName: string;
  onNext: () => void;
}) {
  const { t } = useTranslation();

  return (
    <AccessPage progress={{ step: 1, count: 2 }}>
      <StepFlow.Body>
        <StepFlow.Question>
          {t("accessLink.invited.question", { name: displayName })}
        </StepFlow.Question>
        <StepFlow.Description>
          {t("accessLink.invited.description")}
        </StepFlow.Description>
        <Card className="grid gap-[0.125rem] bg-highlight p-m">
          <p className="font-semibold break-words">{displayName}</p>
          <p className="text-s text-secondary break-all">{email}</p>
        </Card>
      </StepFlow.Body>
      <StepFlow.Actions>
        <StepFlow.MainButton next onClick={onNext}>
          {t("accessLink.invited.action")}
        </StepFlow.MainButton>
      </StepFlow.Actions>
    </AccessPage>
  );
}
