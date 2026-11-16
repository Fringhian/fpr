import { Link } from "@tanstack/react-router";
import { type ReactElement, useState } from "react";
import { useTranslation } from "react-i18next";
import { LeaveGuard } from "../../../lib/leave-guard";
import { raceDayOf } from "../../../lib/race-day";
import type { RecordSearch, RecordStep } from "../../../lib/record-search";
import { useRecord } from "../../_app/-portfolio-sections/record-link";
import { draftOf } from "./draft";
import { type Flow, FlowContext, type Owner } from "./flow";
import { LoadState } from "./load-state";
import { placeOf, shownStep, startOf } from "./steps";
import { STEPS } from "./steps-screens";
import { useLogFind } from "./use-log-find";
import { useSessionChanges } from "./use-session-changes";

/** Where Close and Done go: Portfolio, or History for an edit; the member's page for the admin. */
export function closeLink(
  owner: Pick<Owner, "id" | "own">,
  editing: boolean,
): ReactElement {
  if (!owner.own) {
    return <Link to="/members/$userId" params={{ userId: owner.id }} />;
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
  const [today] = useState(() => raceDayOf(Date.now()));
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
  const base: RecordSearch = { ...search, step: undefined, start };
  const flow: Flow = {
    owner,
    draft,
    today,
    step,
    progress,
    back: previous ? record.link({ ...base, step: previous }) : null,
    close,
    goTo: (next, patch = {}) => record.open({ ...base, ...patch, step: next }),
    recordAnother: () => {
      setRefusal(null);
      record.open({ day: draft.day });
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
