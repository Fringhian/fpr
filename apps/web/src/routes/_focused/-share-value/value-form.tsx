import { Form } from "@base-ui/react/form";
import type { Id, ShareValue } from "@fpr/contracts";
import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { FormError } from "../../../components/molecules/form-error/form-error";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { amountText } from "../../../lib/amount";
import { formatDate, formatTime } from "../../../lib/format/date";
import { formatMoney } from "../../../lib/format/money";
import { useLanguage } from "../../../lib/i18n";
import { LeaveGuard } from "../../../lib/leave-guard";
import { raceTimeZone } from "../../../lib/race-day";
import { useRaceToday } from "../../../lib/use-race-today";
import { useSaveValue } from "./use-save-value";
import { timeNow, type ValueDraft } from "./value-draft";
import { ValueFields } from "./value-fields";
import { ValueNotice } from "./value-notice";
import { ValuePanel } from "./value-panel";

/** “Last value: €40.10 on 3 Mar, by Lea. Every holder's balance updates.” */
function LastValue({ value }: { value: ShareValue | undefined }) {
  const { t } = useTranslation();
  const language = useLanguage();

  const timeZone = raceTimeZone();

  return (
    <p className="text-xs text-secondary">
      {value
        ? t("valueForm.last", {
            price: formatMoney(value.priceEur, language),
            date: formatDate(value.at, language, { timeZone }),
            by: value.enteredBy
              ? t("valueForm.lastBy", { name: value.enteredBy.displayName })
              : "",
          })
        : null}{" "}
      {t("valueForm.updates")}
    </p>
  );
}

/** “Add a value”, or “Edit the value of 3 Mar, 17:30”. */
function Question({ editing }: { editing: ShareValue | undefined }) {
  const { t } = useTranslation();
  const language = useLanguage();

  const timeZone = raceTimeZone();

  return (
    <StepFlow.Question>
      {editing
        ? t("valueForm.editTitle", {
            date: formatDate(editing.at, language, { timeZone }),
            time: formatTime(editing.at, language, { timeZone }),
          })
        : t("valueForm.addTitle")}
    </StepFlow.Question>
  );
}

/**
 * Add a value's page, or a value's edit with `editing`: Close, which leads
 * `close`, the question, the fields, the last value, why it isn't saved yet,
 * then Save value, which confirms the typed value once someone else's change
 * shows; the value as typed on the sky from desktop. Leaving with a value
 * typed asks first.
 */
export function ValueForm({
  shareId,
  shareName,
  values,
  editing,
  close,
}: {
  shareId: Id;
  shareName: string;
  /** The share's values, newest first. */
  values: readonly ShareValue[];
  editing: ShareValue | undefined;
  close: ReactElement;
}) {
  const { t } = useTranslation();
  const language = useLanguage();
  const today = useRaceToday();
  const [draft, setDraft] = useState<ValueDraft>(() => ({
    day: today,
    time: timeNow(),
    price: editing ? amountText(editing.priceEur, language) : "",
  }));
  const save = useSaveValue(shareId, editing);

  const typed = editing
    ? draft.price !== amountText(editing.priceEur, language)
    : draft.price !== "";

  return (
    <StepFlow.Root>
      <StepFlow.Column>
        <StepFlow.Header>
          <StepFlow.Close render={close} />
        </StepFlow.Header>
        <Form className="contents" onFormSubmit={() => save.save(draft)}>
          <StepFlow.Body>
            <StepFlow.Caption>{shareName}</StepFlow.Caption>
            <Question editing={editing} />
            <ValueFields
              draft={draft}
              onChange={(patch) => {
                setDraft((previous) => ({ ...previous, ...patch }));
                save.reset();
              }}
              today={today}
              moment={editing !== undefined}
            />
            {editing ? null : <LastValue value={values[0]} />}
            <ValueNotice
              shareId={shareId}
              changed={save.changed}
              taken={save.taken}
            />
            <FormError>{save.refusal}</FormError>
          </StepFlow.Body>
          <StepFlow.Actions>
            <StepFlow.MainButton
              type="submit"
              loading={save.pending}
              loadingLabel={t("valueForm.saving")}
            >
              {save.changed === null
                ? t("valueForm.save")
                : t("valueForm.confirm")}
            </StepFlow.MainButton>
          </StepFlow.Actions>
        </Form>
      </StepFlow.Column>
      <StepFlow.Panel>
        <ValuePanel
          shareName={shareName}
          draft={draft}
          today={today}
          editing={editing}
        />
      </StepFlow.Panel>
      <LeaveGuard when={typed && !save.saved} />
    </StepFlow.Root>
  );
}
