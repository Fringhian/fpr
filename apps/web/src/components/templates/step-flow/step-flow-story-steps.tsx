import { Badge } from "../../atoms/badge/badge";
import { Button } from "../../atoms/button/button";
import * as StepFlow from "./step-flow";
import {
  ChangeSummary,
  HeaderLanguageSwitch,
  PanelFigure,
  PortfolioList,
  QuantityField,
  SessionList,
  SignInFields,
  SignInPanel,
  useLabels,
} from "./step-flow-story";

/** Which parts the step renders, and its main button's state. */
export interface FlowArgs {
  back: boolean;
  close: boolean;
  progress: boolean;
  step: number;
  count: number;
  caption: boolean;
  panel: boolean;
  next: boolean;
  loading: boolean;
}

/** Record a change, step 4 of 5, through `Basic`. */
export function RecordStep(args: FlowArgs) {
  const { record } = useLabels();

  return (
    <StepFlow.Basic
      back={args.back ? { href: "#when" } : null}
      close={args.close ? { href: "#portfolio" } : null}
      progress={args.progress ? { step: args.step, count: args.count } : null}
      caption={args.caption ? record.caption : null}
      question={record.question}
      action={{
        children: record.action,
        next: args.next,
        loading: args.loading,
      }}
      panel={args.panel ? <ChangeSummary /> : null}
    >
      <QuantityField />
    </StepFlow.Basic>
  );
}

/** Onboarding, step 3 of 4, through `Basic`: a list longer than the screen. */
export function PortfolioStep(args: FlowArgs) {
  const { portfolio } = useLabels();

  return (
    <StepFlow.Basic
      back={args.back ? { href: "#look" } : null}
      close={args.close ? { href: "#home" } : null}
      progress={args.progress ? { step: args.step, count: args.count } : null}
      question={portfolio.question}
      description={portfolio.description}
      action={{
        children: portfolio.action,
        next: args.next,
        loading: args.loading,
      }}
      panel={args.panel ? <PanelFigure caption={portfolio.panel} /> : null}
    >
      <PortfolioList />
    </StepFlow.Basic>
  );
}

/** Sign-in, composed from the parts: a language switch in the header, and a form the main button submits. */
export function SignInStep(args: FlowArgs) {
  const { signIn } = useLabels();

  return (
    <StepFlow.Root>
      <StepFlow.Column>
        <StepFlow.Header>
          {args.back ? <StepFlow.Back href="#access" /> : null}
          <HeaderLanguageSwitch />
        </StepFlow.Header>
        {args.progress ? (
          <StepFlow.Progress step={args.step} count={args.count} />
        ) : null}
        <form className="contents" onSubmit={(event) => event.preventDefault()}>
          <StepFlow.Body>
            <StepFlow.Question>{signIn.question}</StepFlow.Question>
            <StepFlow.Description>{signIn.description}</StepFlow.Description>
            <SignInFields />
          </StepFlow.Body>
          <StepFlow.Actions>
            <StepFlow.MainButton
              type="submit"
              next={args.next}
              loading={args.loading}
              loadingLabel={signIn.action}
            >
              {signIn.action}
            </StepFlow.MainButton>
          </StepFlow.Actions>
        </form>
      </StepFlow.Column>
      {args.panel ? (
        <StepFlow.Panel>
          <SignInPanel />
        </StepFlow.Panel>
      ) : null}
    </StepFlow.Root>
  );
}

/** Record a change, saved, composed from the parts: two buttons, the main one first. */
export function SavedStep(args: FlowArgs) {
  const { saved } = useLabels();

  return (
    <StepFlow.Root>
      <StepFlow.Column>
        <StepFlow.Header>
          {args.back ? <StepFlow.Back href="#review" /> : null}
          {args.close ? <StepFlow.Close href="#portfolio" /> : null}
        </StepFlow.Header>
        <StepFlow.Body>
          <Badge state="saved" className="self-start" />
          <StepFlow.Question>{saved.question}</StepFlow.Question>
          <SessionList />
        </StepFlow.Body>
        <StepFlow.Actions>
          <StepFlow.MainButton next={args.next} loading={args.loading}>
            {saved.another}
          </StepFlow.MainButton>
          <Button intent="secondary" size="step">
            {saved.done}
          </Button>
        </StepFlow.Actions>
      </StepFlow.Column>
      {args.panel ? (
        <StepFlow.Panel>
          <PanelFigure caption={saved.panel} />
        </StepFlow.Panel>
      ) : null}
    </StepFlow.Root>
  );
}
