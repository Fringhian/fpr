import type { Decimal, PortfolioCashBalance } from "@fpr/contracts";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../../lib/api/use-api";
import { raceDayEnd } from "../../../lib/race-day";
import { heldBesides } from "./draft";
import { useFlow } from "./flow";
import { useLogFind } from "./use-log-find";

/**
 * How many of the draft's share the owner held on its day, the change being
 * edited left out: what a sale can remove, and where a holding starts from.
 * `undefined` while it loads.
 */
export function useHeldOn(): Decimal | undefined {
  const api = useApi();
  const { owner, draft } = useFlow();

  const at = raceDayEnd(draft.day);
  const holding = useQuery(
    api.portfolio.holdingAt.queryOptions({
      input: { userId: owner.id, shareId: draft.shareId ?? "", at },
      enabled: draft.kind !== "cash" && draft.shareId !== undefined,
    }),
  );
  return holding.data && heldBesides(holding.data.quantity, draft, at);
}

/**
 * The cash balance the owner had set on the draft's day, before this one:
 * the newest one by then, the one being edited left out. `null` with none,
 * `undefined` while the log is read.
 */
export function useCashBefore(): PortfolioCashBalance | null | undefined {
  const { owner, draft } = useFlow();

  const end = Date.parse(raceDayEnd(draft.day));
  const { found } = useLogFind(
    owner.id,
    (entry) =>
      entry.type === "cash" &&
      entry.id !== draft.entry?.id &&
      Date.parse(entry.effectiveAt) <= end,
  );
  return found?.type === "cash" ? found : found === null ? null : undefined;
}
