import type { PortfolioLogEntry } from "@fpr/contracts";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useApi } from "../../../lib/api/use-api";
import { type Draft, momentOf } from "./draft";
import { useFlow } from "./flow";

/** The write that saves the draft: a new change or cash balance, or the edit of one. */
function useWrites() {
  const api = useApi();
  const addChange = useMutation(api.portfolio.addChange.mutationOptions());
  const setCash = useMutation(api.portfolio.setCash.mutationOptions());
  const updateChange = useMutation(
    api.portfolio.updateChange.mutationOptions(),
  );
  const updateCash = useMutation(api.portfolio.updateCash.mutationOptions());

  return {
    pending: [addChange, setCash, updateChange, updateCash].some(
      (write) => write.isPending,
    ),
    add: { change: addChange.mutateAsync, cash: setCash.mutateAsync },
    update: { change: updateChange.mutateAsync, cash: updateCash.mutateAsync },
  };
}

/**
 * Saves the draft in the owner's portfolio. A new entry carries an id made
 * once per review, so a double press, or a retry after a lost answer, saves
 * it once: the API answers the entry already stored.
 */
export function useSave() {
  const { owner, draft, today } = useFlow();
  const writes = useWrites();
  const [id] = useState(() => crypto.randomUUID());

  const save = async ({
    kind,
    amount,
    shareId,
    entry,
  }: Draft): Promise<PortfolioLogEntry> => {
    const effectiveAt = momentOf(draft, today);
    const value = amount ?? "0";
    const quantityDelta = kind === "sell" ? `-${value}` : value;
    if (entry) {
      return entry.type === "cash"
        ? writes.update.cash({ id: entry.id, amountEur: value, effectiveAt })
        : writes.update.change({ id: entry.id, quantityDelta, effectiveAt });
    }
    return kind === "cash"
      ? writes.add.cash({ userId: owner.id, id, amountEur: value, effectiveAt })
      : writes.add.change({
          userId: owner.id,
          id,
          shareId: shareId ?? "",
          quantityDelta,
          effectiveAt,
        });
  };
  return { save: () => save(draft), pending: writes.pending };
}
