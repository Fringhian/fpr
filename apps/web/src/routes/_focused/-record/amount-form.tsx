import { Form } from "@base-ui/react/form";
import type { Decimal } from "@fpr/contracts";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { IconProps } from "../../../components/foundations/icon/icon";
import * as Field from "../../../components/molecules/field/field";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { isPositive, parseAmount } from "../../../lib/amount";
import { useLanguage } from "../../../lib/i18n";
import { useFlow } from "./flow";

export type AmountFormProps = {
  caption: string;
  question: string;
  /** Names the field for screen readers: the question already asks for it. */
  label: string;
  /** The line under the field while it is valid. */
  help: ReactNode;
  /** The text typed. */
  value: string;
  onValueChange: (value: string) => void;
  /** Zero is a valid answer, as cash is. */
  orZero?: boolean;
  /** What is wrong with an amount that is a number, or `null`: “You held 25 on 3 March”. */
  check?: (amount: Decimal) => string | null;
  /** A control at the field's end, such as All. */
  end?: ReactNode;
  icon?: IconProps["icon"] | undefined;
};

/**
 * How many or how much: one decimal field, its decimals kept as typed, then
 * Review change. A refusal of the last save shows under the field until it
 * changes.
 */
export function AmountForm({
  caption,
  question,
  label,
  help,
  value,
  onValueChange,
  orZero = false,
  check,
  end,
  icon,
}: AmountFormProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { goTo, refusal, setRefusal } = useFlow();

  const validate = (typed: unknown) => {
    const amount =
      typeof typed === "string" ? parseAmount(typed, language) : null;
    if (amount === null || !isPositive(amount, orZero)) {
      return t(
        orZero
          ? "recordChange.amount.zeroOrMore"
          : "recordChange.amount.aboveZero",
      );
    }
    return check?.(amount) ?? null;
  };
  const submit = ({ amount }: { amount: string }) => {
    const parsed = parseAmount(amount, language);
    if (parsed !== null) goTo("review", { amount: parsed });
  };

  return (
    <Form<{ amount: string }>
      className="contents"
      errors={refusal === null ? {} : { amount: refusal }}
      onFormSubmit={submit}
    >
      <StepFlow.Body>
        <StepFlow.Caption>{caption}</StepFlow.Caption>
        <StepFlow.Question>{question}</StepFlow.Question>
        <Field.Root name="amount" validate={validate}>
          <Field.Label className="sr-only">{label}</Field.Label>
          <Field.Control
            decimal
            autoComplete="off"
            icon={icon}
            end={end}
            value={value}
            onValueChange={(next) => {
              onValueChange(next);
              setRefusal(null);
            }}
          />
          <Field.Description>{help}</Field.Description>
          <Field.Error />
        </Field.Root>
      </StepFlow.Body>
      <StepFlow.Actions>
        <StepFlow.MainButton type="submit" next>
          {t("recordChange.actions.review")}
        </StepFlow.MainButton>
      </StepFlow.Actions>
    </Form>
  );
}
