import { Link } from "@tanstack/react-router";
import { useState } from "react";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { LeaveGuard } from "../../../lib/leave-guard";
import type { NewShareSearch } from "../../../lib/new-share-search";
import { useRaceToday } from "../../../lib/use-race-today";
import { BackLink } from "./back-link";
import type { ShareDraft } from "./draft";
import { DraftPanel } from "./draft-panel";
import { NewShareForm } from "./new-share-form";
import { useCreateShare } from "./use-create-share";

/**
 * Create a manual share, for a share the price provider doesn't track: its
 * ISIN, filled in from the lookup, its name, and the value of one unit on a
 * day, the share as typed on the sky on desktop. Close leads back to `back`.
 * Leaving with something typed asks first.
 */
export function NewSharePage({ search }: { search: NewShareSearch }) {
  const today = useRaceToday();
  const [draft, setDraft] = useState<ShareDraft>({
    isin: search.isin ?? "",
    name: "",
    price: "",
    day: today,
  });
  const share = useCreateShare(search, today);

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
        <NewShareForm
          draft={draft}
          onChange={(patch) => {
            setDraft((previous) => ({ ...previous, ...patch }));
            share.reset();
          }}
          today={today}
          share={share}
        />
      </StepFlow.Column>
      <StepFlow.Panel>
        <DraftPanel draft={draft} today={today} />
      </StepFlow.Panel>
      <LeaveGuard when={typed && !share.created} />
    </StepFlow.Root>
  );
}
