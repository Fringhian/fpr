import type { Id, IsoDate } from "@fpr/contracts";
import { createContext, type ReactElement, use } from "react";
import type { MemberColor } from "../../../lib/member-color";
import type { RecordSearch, RecordStep } from "../../../lib/record-search";
import type { Draft } from "./draft";
import type { SessionChanges } from "./use-session-changes";

/** Whose portfolio the change goes in: the viewer's own, or a member's the admin records for. */
export type Owner = {
  id: Id;
  own: boolean;
  name: string;
  color: MemberColor;
};

/** What every step of Record a change reads and does. */
export type Flow = {
  owner: Owner;
  draft: Draft;
  today: IsoDate;
  step: RecordStep;
  /** This run's progress and the step Back returns to. */
  progress: { step: number; count: number } | null;
  /** Back's link, or `null` on the run's first step. */
  back: ReactElement | null;
  /** Close's link and Done's: where the flow leaves for. */
  close: ReactElement;
  /** Opens `step` with the answers so far, `patch` added to them. */
  goTo: (step: RecordStep, patch?: Partial<RecordSearch>) => void;
  /** Opens a new change on the same day. */
  recordAnother: () => void;
  session: SessionChanges;
  /** Why the last save was refused, for the step it sends back to. */
  refusal: string | null;
  setRefusal: (text: string | null) => void;
};

export const FlowContext = createContext<Flow | null>(null);

export function useFlow(): Flow {
  const flow = use(FlowContext);
  if (flow === null) {
    throw new Error("useFlow needs a Record a change flow around it");
  }
  return flow;
}
