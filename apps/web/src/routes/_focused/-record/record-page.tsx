import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ChangeSummary } from "../../../components/molecules/change-summary/change-summary";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { useFlow } from "./flow";
import { useDraftText } from "./use-draft-text";

/** The sky panel's card: the change so far, a dash for each answer still to come. */
export function DraftSummary() {
  const { t } = useTranslation();
  const { draft } = useFlow();
  const text = useDraftText();

  const cash = draft.kind === "cash";
  const rows = [
    { term: t("recordChange.summary.what"), value: text.what ?? null },
    ...(cash
      ? []
      : [{ term: t("recordChange.summary.share"), value: text.share ?? null }]),
    {
      term: t("recordChange.summary.when"),
      value: draft.dayChosen ? text.day : null,
    },
    {
      term: t(`recordChange.summary.${cash ? "amount" : "quantity"}`),
      value: text.howMuch ?? null,
    },
  ];
  return <ChangeSummary title={t("recordChange.summary.title")} rows={rows} />;
}

/**
 * One step of Record a change: Back to the step before, from the run's
 * second step on, Close, the progress, the step, and on desktop `panel` on
 * the sky, the change so far by default.
 */
export function RecordPage({
  panel,
  children,
}: {
  panel?: ReactNode;
  children: ReactNode;
}) {
  const { back, close, progress } = useFlow();

  return (
    <StepFlow.Root>
      <StepFlow.Column>
        <StepFlow.Header>
          {back ? <StepFlow.Back render={back} /> : null}
          <StepFlow.Close render={close} />
        </StepFlow.Header>
        {progress ? <StepFlow.Progress {...progress} /> : null}
        {children}
      </StepFlow.Column>
      <StepFlow.Panel>{panel ?? <DraftSummary />}</StepFlow.Panel>
    </StepFlow.Root>
  );
}
