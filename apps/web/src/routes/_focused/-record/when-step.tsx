import type { IsoDate } from "@fpr/contracts";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import * as Segment from "../../../components/atoms/segment/segment";
import { Calendar } from "../../../components/molecules/calendar/calendar";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { formatDate } from "../../../lib/format/date";
import { useLanguage } from "../../../lib/i18n";
import { addDays } from "../../../lib/race-day";
import { useFlow } from "./flow";
import { RecordPage } from "./record-page";
import { useDraftText } from "./use-draft-text";

/** Today and Yesterday, one press each, and the day picked on the calendar when it is another. */
function QuickDays({
  value,
  onValueChange,
}: {
  value: IsoDate;
  onValueChange: (day: IsoDate) => void;
}) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { today } = useFlow();

  const yesterday = addDays(today, -1);
  const other = value !== today && value !== yesterday;
  return (
    <Segment.Root<IsoDate>
      backdrop="snow"
      aria-label={t("recordChange.when.quick")}
      value={value}
      onValueChange={onValueChange}
      className="self-start"
    >
      <Segment.Item value={today}>{t("recordChange.when.today")}</Segment.Item>
      {other ? (
        <Segment.Item value={value}>
          {formatDate(value, language, { style: "long" })}
        </Segment.Item>
      ) : null}
      <Segment.Item value={yesterday}>
        {t("recordChange.when.yesterday")}
      </Segment.Item>
    </Segment.Root>
  );
}

/**
 * When: today by default, Yesterday, or any earlier day on the calendar;
 * the days after today can't be picked. It comes before how many, since
 * what can be sold depends on what was held that day.
 */
export function WhenStep() {
  const { t } = useTranslation();
  const { draft, today, goTo } = useFlow();
  const text = useDraftText();
  const [day, setDay] = useState(draft.day);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    goTo("amount", { day });
  };

  return (
    <RecordPage>
      <form className="contents" noValidate onSubmit={submit}>
        <StepFlow.Body>
          <StepFlow.Caption>
            {text.caption(text.what, text.share)}
          </StepFlow.Caption>
          <StepFlow.Question>
            {t("recordChange.when.question")}
          </StepFlow.Question>
          <QuickDays value={day} onValueChange={setDay} />
          <Calendar
            value={day}
            onValueChange={setDay}
            max={today}
            aria-label={t("recordChange.when.calendar")}
            className="max-w-[24rem]"
          />
        </StepFlow.Body>
        <StepFlow.Actions>
          <StepFlow.MainButton type="submit" next>
            {t(
              draft.kind === "cash"
                ? "recordChange.actions.amount"
                : "recordChange.actions.quantity",
            )}
          </StepFlow.MainButton>
        </StepFlow.Actions>
      </form>
    </RecordPage>
  );
}
