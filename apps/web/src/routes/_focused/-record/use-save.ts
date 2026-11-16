import type { PortfolioLogEntry } from "@fpr/contracts";
import { useState } from "react";
import { type EntryValue, useEntryWrites } from "../../../lib/entry-writes";
import { momentOf } from "./draft";
import { useFlow } from "./flow";

/**
 * Saves the draft in the owner's portfolio. A new entry carries an id made
 * once per review, so a double press, or a retry after a lost answer, saves
 * it once: the API answers the entry already stored.
 */
export function useSave() {
  const { owner, draft, today } = useFlow();
  const writes = useEntryWrites();
  const [id] = useState(() => crypto.randomUUID());

  const save = (): Promise<PortfolioLogEntry> => {
    const { kind, shareId, entry } = draft;
    const effectiveAt = momentOf(draft, today);
    const amount = draft.amount ?? "0";
    const value: EntryValue =
      (entry?.type ?? (kind === "cash" ? "cash" : "change")) === "cash"
        ? { type: "cash", amountEur: amount, effectiveAt }
        : {
            type: "change",
            shareId: shareId ?? "",
            quantityDelta: kind === "sell" ? `-${amount}` : amount,
            effectiveAt,
          };
    return entry
      ? writes.update(entry.id, value)
      : writes.add(owner.id, id, value);
  };
  return { save, pending: writes.pending };
}
