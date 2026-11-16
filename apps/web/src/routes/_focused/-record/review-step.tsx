import Big from "big.js";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "../../../components/atoms/card/card";
import { FormError } from "../../../components/molecules/form-error/form-error";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { isApiError, useErrorText } from "../../../lib/api/errors";
import { formatMoney } from "../../../lib/format/money";
import { formatQuantity } from "../../../lib/format/number";
import { useLanguage } from "../../../lib/i18n";
import { useEntryRefusalText } from "../../_app/-portfolio-sections/use-entry-refusal";
import { useFlow } from "./flow";
import { ReadLine } from "./read-line";
import { RecordPage } from "./record-page";
import { type BeforeRead, useCashBefore, useHeldOn } from "./use-before";
import { useDraftText } from "./use-draft-text";
import { useSave } from "./use-save";

function OutcomeLine<T>({
  read,
  failed,
  done,
}: {
  read: BeforeRead<T>;
  failed: string;
  done: (value: T) => string;
}) {
  return read.failed || read.value !== undefined ? (
    <p className="mt-xs text-s">
      <ReadLine read={read} loading={null} failed={failed} done={done} />
    </p>
  ) : null;
}

// What the change does: the holding from 50 to 60, or the cash it replaces.
function Outcome() {
  const { t } = useTranslation();
  const language = useLanguage();
  const { draft, owner } = useFlow();
  const held = useHeldOn();
  const cash = useCashBefore();

  const who = owner.own ? "you" : "member";
  const { amount } = draft;
  if (draft.kind === "cash") {
    return (
      <OutcomeLine
        read={cash}
        failed={t("recordChange.cash.beforeFailed")}
        done={(before) =>
          before === null
            ? t(`recordChange.review.firstCash.${who}`, { name: owner.name })
            : t(`recordChange.review.cashWas.${who}`, {
                amount: formatMoney(before.amountEur, language),
                name: owner.name,
              })
        }
      />
    );
  }
  if (amount === undefined) return null;
  const delta = new Big(amount).times(draft.kind === "sell" ? -1 : 1);
  return (
    <OutcomeLine
      read={held}
      failed={t("recordChange.quantity.heldFailed")}
      done={(before) => {
        // The holding after keeps as many decimals as the amount typed: 40 + 10.50 is 50.50.
        const digits = Math.max(
          ...[before, amount].map((value) => value.split(".")[1]?.length ?? 0),
        );
        const after = new Big(before).plus(delta).toFixed(digits);
        return t(`recordChange.review.holding.${who}`, {
          before: formatQuantity(before, language),
          after: formatQuantity(after, language),
          name: owner.name,
        });
      }}
    />
  );
}

function ReviewCard() {
  const { t } = useTranslation();
  const text = useDraftText();
  const { draft } = useFlow();

  return (
    <Card className="grid gap-xs bg-highlight p-m">
      <p className="text-xs text-secondary">{text.what}</p>
      <p className="text-l font-semibold">
        {draft.kind === "cash"
          ? text.howMuch
          : t("recordChange.review.units", {
              quantity: text.howMuch,
              share: text.share ?? "",
            })}
      </p>
      <p className="text-s text-secondary">
        {t("recordChange.review.on", { date: text.day })}
      </p>
      <Outcome />
    </Card>
  );
}

/**
 * Check and save: the change as it will be saved, then Save change. A save
 * that would take a holding below zero goes back to how many, naming the
 * change it would break; any other failure stays here, to try again.
 */
export function ReviewStep() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const refusalText = useEntryRefusalText();
  const { draft, goTo, showSaved, session, setRefusal } = useFlow();
  const { save, pending } = useSave();
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    try {
      const entry = await save();
      session.add(entry, draft.entry ?? null);
      showSaved();
    } catch (failure) {
      if (!isApiError(failure, "holding_below_zero")) {
        setError(errorText(failure));
        return;
      }
      setRefusal(refusalText(failure));
      goTo("amount");
    }
  };

  return (
    <RecordPage>
      <form
        className="contents"
        noValidate
        onSubmit={(event) => void submit(event)}
      >
        <StepFlow.Body>
          <StepFlow.Question>
            {t("recordChange.review.question")}
          </StepFlow.Question>
          <ReviewCard />
          <FormError>{error}</FormError>
        </StepFlow.Body>
        <StepFlow.Actions>
          <StepFlow.MainButton
            type="submit"
            loading={pending}
            loadingLabel={t("recordChange.review.saving")}
          >
            {t("recordChange.actions.save")}
          </StepFlow.MainButton>
        </StepFlow.Actions>
      </form>
    </RecordPage>
  );
}
