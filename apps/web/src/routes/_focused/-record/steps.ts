import type {
  RecordKind,
  RecordSearch,
  RecordStep,
} from "../../../lib/record-search";
import type { Draft } from "./draft";

/** The steps a change goes through: cash has no share. */
function stepsOf(kind: RecordKind | undefined): readonly RecordStep[] {
  return kind === "cash"
    ? ["what", "when", "amount", "review"]
    : ["what", "share", "when", "amount", "review"];
}

/**
 * The step the flow opened on: the first one the address doesn't already
 * answer. An edit, cash, or a purchase or sale of a known share starts at
 * When; a purchase or sale alone at Which share; anything else at What.
 */
export function startOf(search: RecordSearch): RecordStep {
  if (search.start) return search.start;
  if (search.entry || search.kind === "cash") return "when";
  if (search.kind) return search.share ? "when" : "share";
  return "what";
}

/**
 * The step to show: the one the address names, or the first step before it
 * still missing its answer, so an address cut short never shows a step
 * without what it needs.
 */
export function shownStep(
  search: RecordSearch,
  draft: Pick<Draft, "kind" | "shareId" | "amount">,
): RecordStep {
  const step = search.step ?? startOf(search);
  if (step === "saved" || step === "what") return step;
  if (!draft.kind) return "what";
  if (draft.kind === "cash" && step === "share") return "when";
  if (draft.kind !== "cash" && !draft.shareId) return "share";
  if (step === "review" && !draft.amount) return "amount";
  return step;
}

/**
 * Where `step` stands in this run's steps, from the one it opened on: its
 * place from 1, the count, and the step before it, if any.
 */
export function placeOf(
  step: RecordStep,
  start: RecordStep,
  kind: RecordKind | undefined,
) {
  const all = stepsOf(kind);
  const run = all.slice(Math.max(all.indexOf(start), 0));
  const index = run.indexOf(step);

  return {
    progress: index < 0 ? null : { step: index + 1, count: run.length },
    previous: index > 0 ? run[index - 1] : undefined,
  };
}
