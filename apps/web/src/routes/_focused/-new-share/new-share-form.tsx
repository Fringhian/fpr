import { Form } from "@base-ui/react/form";
import type { IsoDate } from "@fpr/contracts";
import { useTranslation } from "react-i18next";
import { FormError } from "../../../components/molecules/form-error/form-error";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import type { ShareDraft } from "./draft";
import { ShareFields } from "./share-fields";
import type { useCreateShare } from "./use-create-share";

/**
 * The step: the question, the fields, the API's refusal, then Create share.
 * An ISIN another share has is refused under its field, any other refusal
 * under the form.
 */
export function NewShareForm({
  draft,
  onChange,
  today,
  share,
}: {
  draft: ShareDraft;
  onChange: (patch: Partial<ShareDraft>) => void;
  today: IsoDate;
  share: ReturnType<typeof useCreateShare>;
}) {
  const { t } = useTranslation();

  const { text, takenLink } = share.refusal;
  return (
    <Form
      className="contents"
      errors={takenLink && text ? { isin: text } : {}}
      onFormSubmit={() => share.create(draft)}
    >
      <StepFlow.Body>
        <StepFlow.Question>{t("newShare.question")}</StepFlow.Question>
        <StepFlow.Description>{t("newShare.description")}</StepFlow.Description>
        <ShareFields
          draft={draft}
          onChange={onChange}
          today={today}
          takenLink={takenLink}
        />
        <p className="text-xs text-secondary">{t("newShare.help")}</p>
        <FormError>{takenLink ? null : text}</FormError>
      </StepFlow.Body>
      <StepFlow.Actions>
        <StepFlow.MainButton
          type="submit"
          loading={share.pending}
          loadingLabel={t("newShare.creating")}
        >
          {t("newShare.create")}
        </StepFlow.MainButton>
      </StepFlow.Actions>
    </Form>
  );
}
