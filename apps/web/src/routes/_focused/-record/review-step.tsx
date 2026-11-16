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
import { RecordPage } from "./record-page";
import { useCashBefore, useHeldOn } from "./use-before";
import { useDraftText } from "./use-draft-text";
import { useSave } from "./use-save";

/** What the change does: the holding from 50 to 60, or the cash it replaces. */
function useOutcome(): string | null {
  const { t } = useTranslation();
  const language = useLanguage();
  const { draft, owner } = useFlow();
  const held = useHeldOn();
  const cash = useCashBefore();

  const who = owner.own ? "you" : "member";
  if (draft.kind === "cash") {
    if (cash === undefined) return null;
    return cash === null
      ? t(`recordChange.review.firstCash.${who}`, { name: owner.name })
      : t(`recordChange.review.cashWas.${who}`, {
          amount: formatMoney(cash.amountEur, language),
          name: owner.name,
        });
  }
  if (held === undefined || draft.amount === undefined) return null;
  const delta = new Big(draft.amount).times(draft.kind === "sell" ? -1 : 1);
  // The holding after keeps as many decimals as the amount typed: 40 + 10.50 is 50.50.
  const digits = Math.max(
    ...[held, draft.amount].map((value) => value.split(".")[1]?.length ?? 0),
  );
  return t(`recordChange.review.holding.${who}`, {
    before: formatQuantity(held, language),
    after: formatQuantity(new Big(held).plus(delta).toFixed(digits), language),
    name: owner.name,
  });
}

/** The change as it will be saved, on a tinted card. */
function ReviewCard() {
  const { t } = useTranslation();
  const text = useDraftText();
  const { draft } = useFlow();
  const outcome = useOutcome();

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
      {outcome ? <p className="mt-xs text-s">{outcome}</p> : null}
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
