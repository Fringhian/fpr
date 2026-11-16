import type { Id } from "@fpr/contracts";
import { type FormEvent, useState } from "react";
import { useTranslation } from "react-i18next";
import { FormError } from "../../../components/molecules/form-error/form-error";
import * as ShareSearch from "../../../components/organisms/share-search/share-search";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { useErrorText } from "../../../lib/api/errors";
import { useShareSearch } from "../../../lib/share-search";
import { DEFAULT_SETTING } from "../../../lib/view-state/view-search";
import { useFlow } from "./flow";
import { RecordPage } from "./record-page";
import { useDraftText } from "./use-draft-text";

/**
 * Step 2 of a purchase or a sale, Which share: the Shares search over FPR's
 * shares, the one already picked selected. Changing the share drops the
 * quantity entered for the last one.
 */
export function ShareStep() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const { draft, goTo } = useFlow();
  const text = useDraftText();
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<Id | null>(draft.shareId ?? null);
  const [missing, setMissing] = useState(false);
  const search = useShareSearch(q, DEFAULT_SETTING.period);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (picked === null) {
      setMissing(true);
      return;
    }
    goTo("when", {
      share: picked,
      amount: picked === draft.shareId ? draft.amount : undefined,
    });
  };

  return (
    <RecordPage>
      <form className="contents" noValidate onSubmit={submit}>
        <StepFlow.Body>
          <StepFlow.Caption>{text.caption(text.what)}</StepFlow.Caption>
          <StepFlow.Question>
            {t("recordChange.share.question")}
          </StepFlow.Question>
          <ShareSearch.Basic
            label={t("shareSearch.label")}
            q={q}
            onQChange={setQ}
            shares={search.data?.shares}
            error={search.isError ? errorText(search.error) : null}
            onRetry={() => void search.refetch()}
            value={picked}
            onValueChange={(id) => {
              setPicked(id);
              setMissing(false);
            }}
          />
          <FormError>
            {missing ? t("recordChange.share.missing") : null}
          </FormError>
        </StepFlow.Body>
        <StepFlow.Actions>
          <StepFlow.MainButton type="submit" next>
            {t("recordChange.actions.date")}
          </StepFlow.MainButton>
        </StepFlow.Actions>
      </form>
    </RecordPage>
  );
}
