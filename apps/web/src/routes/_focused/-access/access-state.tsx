import type { ReactNode } from "react";
import {
  StateIcon,
  type StateIconProps,
} from "../../../components/atoms/state-icon/state-icon";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";

/**
 * A way in that stops here, said on its own page: an access link that
 * expired or was already used, access that ended, a setup already done. Its
 * icon, heading and one sentence, then `children` under the sentence and
 * `action`, the main button, when something follows.
 */
export function AccessState({
  icon,
  title,
  description,
  action,
  children,
}: {
  icon: StateIconProps["icon"];
  title: ReactNode;
  description: ReactNode;
  action?: StepFlow.MainButtonProps | undefined;
  children?: ReactNode;
}) {
  return (
    <StepFlow.Root>
      <StepFlow.Column>
        <StepFlow.Header />
        <StepFlow.Body>
          <StateIcon icon={icon} />
          <StepFlow.Question>{title}</StepFlow.Question>
          <StepFlow.Description>{description}</StepFlow.Description>
          {children}
        </StepFlow.Body>
        {action ? (
          <StepFlow.Actions>
            <StepFlow.MainButton {...action} />
          </StepFlow.Actions>
        ) : null}
      </StepFlow.Column>
    </StepFlow.Root>
  );
}
