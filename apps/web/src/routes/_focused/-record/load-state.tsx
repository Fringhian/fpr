import { QuestionIcon } from "@phosphor-icons/react/Question";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { LoadingPlaceholder } from "../../../components/atoms/loading-placeholder/loading-placeholder";
import { StateIcon } from "../../../components/atoms/state-icon/state-icon";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { useLoadFailedMessage } from "../../-states/load-failed";

/**
 * A focused page before its first step shows, while what it is about
 * loads: the entry Record a change edits, the member the admin records for,
 * or a manual share's value. Then its load failed, with Try again, or it is
 * no longer there. A failed load says “You’re offline” with no network, as
 * every screen does.
 */
export function LoadState({
  subject,
  state,
  onRetry,
  close,
}: {
  subject: "entry" | "member" | "value";
  state: "loading" | "failed" | "missing";
  onRetry: () => void;
  close: ReactElement;
}) {
  const { t } = useTranslation();
  const failed = useLoadFailedMessage(
    onRetry,
    t(`recordChange.load.${subject}.failed`),
  );

  const message =
    state === "failed"
      ? failed
      : {
          icon: QuestionIcon,
          title: t(`recordChange.load.${subject}.missing`),
          description: t("recordChange.load.missingLine"),
        };

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
              {message.icon ? <StateIcon icon={message.icon} /> : null}
              <StepFlow.Question>{message.title}</StepFlow.Question>
              <StepFlow.Description>{message.description}</StepFlow.Description>
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
