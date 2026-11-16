import { Form } from "@base-ui/react/form";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { FormError } from "../../../components/molecules/form-error/form-error";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { LeaveGuard } from "../../../lib/leave-guard";
import type { NewShareSearch } from "../../../lib/new-share-search";
import { raceDayOf } from "../../../lib/race-day";
import { BackLink } from "./back-link";
import type { ShareDraft } from "./draft";
import { DraftPanel } from "./draft-panel";
import { ShareFields } from "./share-fields";
import { useCreateShare } from "./use-create-share";

/**
 * Create a manual share, for a share the price provider doesn't track: its
 * ISIN, filled in from the lookup, its name, and the value of one unit on a
 * day. An ISIN another share has is refused under the field, with a link to
 * that share. Close leads back to `back`. Leaving with something typed asks
 * first.
 */
export function NewSharePage({ search }: { search: NewShareSearch }) {
  const { t } = useTranslation();
  const [today] = useState(() => raceDayOf(Date.now()));
  const [draft, setDraft] = useState<ShareDraft>({
    isin: search.isin ?? "",
    name: "",
    price: "",
    day: today,
  });
  const share = useCreateShare(search, today);

  const { refusal, takenBy } = share;
  const typed =
    draft.name !== "" ||
    draft.price !== "" ||
    draft.isin !== (search.isin ?? "");

  return (
    <StepFlow.Root>
      <StepFlow.Column>
        <StepFlow.Header>
          <StepFlow.Close
            render={
              search.back ? (
                <BackLink href={search.back} />
              ) : (
                <Link to="/shares" />
              )
            }
          />
        </StepFlow.Header>
        <Form
          className="contents"
          errors={takenBy && refusal ? { isin: refusal } : {}}
          onFormSubmit={() => share.create(draft)}
        >
          <StepFlow.Body>
            <StepFlow.Question>{t("newShare.question")}</StepFlow.Question>
            <StepFlow.Description>
              {t("newShare.description")}
            </StepFlow.Description>
            <ShareFields
              draft={draft}
              onChange={(patch) => {
                setDraft((previous) => ({ ...previous, ...patch }));
                share.reset();
              }}
              today={today}
              takenLink={
                takenBy === null ? null : (
                  <Link to="/shares/$shareId" params={{ shareId: takenBy }} />
                )
              }
            />
            <p className="text-xs text-secondary">{t("newShare.help")}</p>
            <FormError>{takenBy ? null : refusal}</FormError>
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
      </StepFlow.Column>
      <StepFlow.Panel>
        <DraftPanel draft={draft} today={today} />
      </StepFlow.Panel>
      <LeaveGuard when={typed && !share.created} />
    </StepFlow.Root>
  );
}
