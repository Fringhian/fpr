import { Link } from "@tanstack/react-router";
import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { editPortfolioLink } from "../../../lib/edit-portfolio";
import { LeaveGuard } from "../../../lib/leave-guard";
import { raceDayOf } from "../../../lib/race-day";
import type { RecordSearch, RecordStep } from "../../../lib/record-search";
import { useRaceToday } from "../../../lib/use-race-today";
import { useRecord } from "../../_app/-portfolio-sections/record-link";
import { draftOf } from "./draft";
import { type Flow, FlowContext, type Owner } from "./flow";
import { LoadState } from "./load-state";
import { placeOf, shownStep, startOf } from "./steps";
import { STEPS } from "./steps-screens";
import { useLogFind } from "./use-log-find";
import { useSessionChanges } from "./use-session-changes";

/**
 * Where Close and Done go: Portfolio, or History for an edit; for the admin,
 * the member's page in edit mode, or the member's history for an edit.
 */
export function closeLink(
  owner: Pick<Owner, "id" | "own">,
  editing: boolean,
): ReactElement {
  if (!owner.own) {
    return editing ? (
      <Link to="/members/$userId/history" params={{ userId: owner.id }} />
    ) : (
      editPortfolioLink(owner.id)
    );
  }
  return editing ? <Link to="/portfolio/history" /> : <Link to="/portfolio" />;
}

/**
 * Record a change in `owner`'s portfolio, one step per screen, the step and
 * the answers so far in the address, so the browser's Back returns to the
 * step before. The changes saved in this sitting stay listed, with Undo,
 * until the page is left. Leaving with a change under way asks first.
 */
export function RecordFlow({
  owner,
  search,
}: {
  owner: Owner;
  search: RecordSearch;
}) {
  const { t } = useTranslation();
  const today = useRaceToday();
  const [firstDraftId] = useState(() => crypto.randomUUID());
  const [refusal, setRefusal] = useState<string | null>(null);
  const session = useSessionChanges();
  const record = useRecord(owner.id);
  const edit = useLogFind(
    owner.id,
    (entry) => entry.id === search.entry,
    search.entry !== undefined,
  );

  const close = closeLink(owner, search.entry !== undefined);
  if (search.entry !== undefined && !edit.found) {
    return (
      <LoadState
        subject="entry"
        state={
          edit.found === null ? "missing" : edit.failed ? "failed" : "loading"
        }
        onRetry={edit.retry}
        close={close}
      />
    );
  }
  const draft = draftOf(search, edit.found ?? undefined, today);
  const start = startOf(search);
  const shown = shownStep(search, draft);
  const step: RecordStep = shown === "saved" && !session.last ? start : shown;
  const { progress, previous } = placeOf(step, start, draft.kind);
  const draftId = search.draft ?? firstDraftId;
  const base: RecordSearch = {
    ...search,
    step: undefined,
    start,
    draft: draftId,
  };
  const last = session.last?.entry;
  const flow: Flow = {
    owner,
    draft,
    draftId,
    today,
    step,
    progress,
    back: previous ? record.link({ ...base, step: previous }) : null,
    close,
    goTo: (next, patch = {}) => record.open({ ...base, ...patch, step: next }),
    showSaved: () =>
      record.open({ entry: search.entry, step: "saved" }, { replace: true }),
    recordAnother: () => {
      setRefusal(null);
      record.open({
        day: last ? raceDayOf(last.effectiveAt) : draft.day,
        draft: crypto.randomUUID(),
      });
    },
    session,
    refusal,
    setRefusal,
  };
  const Step = STEPS[step];

  return (
    <FlowContext value={flow}>
      <Step />
      <LeaveGuard
        when={step !== "saved" && step !== start}
        description={t("recordChange.leave")}
      />
    </FlowContext>
  );
}
