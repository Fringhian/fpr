import type { Decimal, PortfolioCashBalance } from "@fpr/contracts";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../../lib/api/use-api";
import { raceDayEnd } from "../../../lib/race-day";
import { heldBesides } from "./draft";
import { useFlow } from "./flow";
import { useLogFind } from "./use-log-find";

/** A read a step shows: `value`, `undefined` while it loads; `failed`, with `retry`. */
export type BeforeRead<T> = {
  value: T | undefined;
  failed: boolean;
  retry: () => void;
};

/**
 * How many of the draft's share the owner held on its day, the change being
 * edited left out: what a sale can remove, and where a holding starts from.
 */
export function useHeldOn(): BeforeRead<Decimal> {
  const api = useApi();
  const { owner, draft } = useFlow();

  const at = raceDayEnd(draft.day);
  const holding = useQuery(
    api.portfolio.holdingAt.queryOptions({
      input: { userId: owner.id, shareId: draft.shareId ?? "", at },
      enabled: draft.kind !== "cash" && draft.shareId !== undefined,
    }),
  );
  const held = holding.data?.quantity;
  return {
    value:
      held === undefined || held === null
        ? undefined
        : heldBesides(held, draft, at),
    failed: holding.isError,
    retry: () => void holding.refetch(),
  };
}

/**
 * The cash balance the owner had set on the draft's day, before this one:
 * the newest one by then, the one being edited left out, or `null` with none.
 */
export function useCashBefore(): BeforeRead<PortfolioCashBalance | null> {
  const { owner, draft } = useFlow();

  const end = Date.parse(raceDayEnd(draft.day));
  const { found, failed, retry } = useLogFind(
    owner.id,
    (entry) =>
      entry.type === "cash" &&
      entry.id !== draft.entry?.id &&
      Date.parse(entry.effectiveAt) <= end,
  );
  return {
    value: found?.type === "cash" ? found : found === null ? null : undefined,
    failed,
    retry,
  };
}
