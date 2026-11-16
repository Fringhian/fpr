// The step flow's parts, imported as a namespace: `import * as StepFlow from "…/step-flow"`.
import type { ComponentProps, ReactNode } from "react";
import type { IconLinkProps } from "../../../lib/icon-link";
import type { StepProgressProps } from "../../atoms/step-progress/step-progress";
import {
  Actions,
  Body,
  Caption,
  Description,
  MainButton,
  type MainButtonProps,
  Question,
} from "./step-flow-content";
import { Column, Panel, Root } from "./step-flow-frame";
import { Back, Close, Header, Progress } from "./step-flow-header";

export {
  Actions,
  Body,
  Caption,
  Description,
  MainButton,
  type MainButtonProps,
  Question,
} from "./step-flow-content";
export { Column, Panel, Root } from "./step-flow-frame";
export { Back, Close, Header, Progress } from "./step-flow-header";

export type BasicProps = {
  /** `Back`'s props, top left: `{ href }`, or `{ render }` for the router's link. Leave it out on a flow's first step. */
  back?: IconLinkProps | null | undefined;
  /** `Close`'s props, top right, for a flow opened from another page, such as Record a change. */
  close?: IconLinkProps | null | undefined;
  /** The step and the flow's step count. Leave it out for a single step, such as sign-in. */
  progress?: Pick<StepProgressProps, "step" | "count"> | null | undefined;
  /** What the flow knows so far, above the question: “Bought · World Index ETF”. */
  caption?: ReactNode;
  /** The step's one question, the page's heading. */
  question: ReactNode;
  /** One sentence under the question. */
  description?: ReactNode;
  /** The main button's props, its label as `children`. Leave it out on a step with nothing to do next, such as an expired link. */
  action?: MainButtonProps | null | undefined;
  /** The sky panel's content, on desktop only: what the step changes. */
  panel?: ReactNode;
  /** What answers the question, under it: a field, options, a list. */
  children?: ReactNode;
} & ComponentProps<"div">;

/**
 * A focused page with one question, ready-made: the header with `back` and
 * `close`, the progress, the caption, the question and its description, the
 * step's content, the main button, and on desktop the sky panel. A step with
 * a form, a language switch or more than one button composes the parts.
 */
export function Basic({
  back,
  close,
  progress,
  caption,
  question,
  description,
  action,
  panel,
  children,
  ...props
}: BasicProps) {
  return (
    <Root {...props}>
      <Column>
        <Header>
          {back ? <Back {...back} /> : null}
          {close ? <Close {...close} /> : null}
        </Header>
        {progress ? <Progress {...progress} /> : null}
        <Body>
          {caption ? <Caption>{caption}</Caption> : null}
          <Question>{question}</Question>
          {description ? <Description>{description}</Description> : null}
          {children}
        </Body>
        {action ? (
          <Actions>
            <MainButton {...action} />
          </Actions>
        ) : null}
      </Column>
      {panel ? <Panel>{panel}</Panel> : null}
    </Root>
  );
}
