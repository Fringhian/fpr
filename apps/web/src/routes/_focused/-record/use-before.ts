import type { Decimal, PortfolioCashAt } from "@fpr/contracts";
import { useQuery } from "@tanstack/react-query";
import { useApi } from "../../../lib/api/use-api";
import { raceDayEnd } from "../../../lib/race-day";
import { heldBesides } from "./draft";
import { useFlow } from "./flow";

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
  return {
    value: holding.data && heldBesides(holding.data.quantity, draft, at),
    failed: holding.isError,
    retry: () => void holding.refetch(),
  };
}

/**
 * The cash the owner had set on the draft's day, before this balance: the
 * newest one by then, or `null` with none. When that is the balance being
 * edited, the cash just before it is asked for instead.
 */
export function useCashBefore(): BeforeRead<PortfolioCashAt> {
  const api = useApi();
  const { owner, draft } = useFlow();

  const atEnd = useQuery(
    api.portfolio.cashAt.queryOptions({
      input: { userId: owner.id, at: raceDayEnd(draft.day) },
      enabled: draft.kind === "cash",
    }),
  );
  const edited = draft.entry?.type === "cash" ? draft.entry : undefined;
  const isEdited =
    edited !== undefined &&
    atEnd.data != null &&
    Date.parse(atEnd.data.setAt) === Date.parse(edited.effectiveAt);
  const justBefore = useQuery(
    api.portfolio.cashAt.queryOptions({
      input: {
        userId: owner.id,
        at: edited
          ? new Date(Date.parse(edited.effectiveAt) - 1).toISOString()
          : "",
      },
      enabled: isEdited,
    }),
  );
  const read = isEdited ? justBefore : atEnd;
  return {
    value: read.data,
    failed: read.isError,
    retry: () => void read.refetch(),
  };
}
