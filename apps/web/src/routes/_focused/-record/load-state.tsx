import { QuestionIcon } from "@phosphor-icons/react/Question";
import { WarningCircleIcon } from "@phosphor-icons/react/WarningCircle";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { LoadingPlaceholder } from "../../../components/atoms/loading-placeholder/loading-placeholder";
import { StateIcon } from "../../../components/atoms/state-icon/state-icon";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";

/**
 * Record a change before its first step shows, while what it is about
 * loads: the entry it edits, or the member the admin records for. Then its
 * load failed, with Try again, or it is no longer there.
 */
export function LoadState({
  subject,
  state,
  onRetry,
  close,
}: {
  subject: "entry" | "member";
  state: "loading" | "failed" | "missing";
  onRetry: () => void;
  close: ReactElement;
}) {
  const { t } = useTranslation();

  return (
    <StepFlow.Root>
      <StepFlow.Column>
        <StepFlow.Header>
          <StepFlow.Close render={close} />
        </StepFlow.Header>
        <StepFlow.Body>
          {state === "loading" ? (
            <LoadingPlaceholder className="min-h-[12rem]">
              {t(`recordChange.load.${subject}.loading`)}
            </LoadingPlaceholder>
          ) : (
            <>
              <StateIcon
                icon={state === "failed" ? WarningCircleIcon : QuestionIcon}
              />
              <StepFlow.Question>
                {t(`recordChange.load.${subject}.${state}`)}
              </StepFlow.Question>
              <StepFlow.Description>
                {t(`recordChange.load.${state}Line`)}
              </StepFlow.Description>
            </>
          )}
        </StepFlow.Body>
        {state === "failed" ? (
          <StepFlow.Actions>
            <StepFlow.MainButton onClick={onRetry}>
              {t("recordChange.load.retry")}
            </StepFlow.MainButton>
          </StepFlow.Actions>
        ) : null}
      </StepFlow.Column>
    </StepFlow.Root>
  );
}
