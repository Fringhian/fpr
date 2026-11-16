import type { PortfolioLogEntry } from "@fpr/contracts";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useApi } from "../../../lib/api/use-api";
import { useEntryRefusal } from "../../_app/-portfolio-sections/use-entry-refusal";

/** A change saved in this sitting: the entry, and what it was before an edit. */
export type SavedChange = {
  entry: PortfolioLogEntry;
  /** The entry before an edit, or `null` for a new one. */
  previous: PortfolioLogEntry | null;
  undone: boolean;
  busy: boolean;
};

/** Takes a saved change back: deletes a new entry, or puts an edited one back as it was. */
function useRevert() {
  const api = useApi();
  const deleteChange = useMutation(
    api.portfolio.deleteChange.mutationOptions(),
  );
  const deleteCash = useMutation(api.portfolio.deleteCash.mutationOptions());
  const updateChange = useMutation(
    api.portfolio.updateChange.mutationOptions(),
  );
  const updateCash = useMutation(api.portfolio.updateCash.mutationOptions());

  return async ({ entry, previous }: SavedChange): Promise<void> => {
    const { id } = entry;
    if (previous === null) {
      await (entry.type === "cash"
        ? deleteCash.mutateAsync({ id })
        : deleteChange.mutateAsync({ id }));
      return;
    }
    const { effectiveAt } = previous;
    await (previous.type === "cash"
      ? updateCash.mutateAsync({
          id,
          amountEur: previous.amountEur,
          effectiveAt,
        })
      : updateChange.mutateAsync({
          id,
          quantityDelta: previous.quantityDelta,
          effectiveAt,
        }));
  };
}

/**
 * The changes saved in this sitting of Record a change, oldest first, each
 * with Undo. An Undo that would take a holding below zero is refused, and a
 * toast names the change it would break. They live as long as the flow's
 * page: leaving it ends the sitting, and the changes stay saved.
 */
export function useSessionChanges() {
  const { t } = useTranslation();
  const refuse = useEntryRefusal();
  const revert = useRevert();
  const [items, setItems] = useState<readonly SavedChange[]>([]);

  const patch = (id: string, change: Partial<SavedChange>) =>
    setItems((all) =>
      all.map((item) => (item.entry.id === id ? { ...item, ...change } : item)),
    );

  return {
    items,
    last: items.at(-1),
    /** Adds a change just saved; one saved again, by a second press, keeps its place. */
    add: (entry: PortfolioLogEntry, previous: PortfolioLogEntry | null) =>
      setItems((all) =>
        all.some((item) => item.entry.id === entry.id)
          ? all
          : [...all, { entry, previous, undone: false, busy: false }],
      ),
    undo: async (item: SavedChange) => {
      patch(item.entry.id, { busy: true });
      try {
        await revert(item);
        patch(item.entry.id, { busy: false, undone: true });
      } catch (error) {
        patch(item.entry.id, { busy: false });
        refuse(t("recordChange.saved.undoRefused"), error);
      }
    },
  };
}

export type SessionChanges = ReturnType<typeof useSessionChanges>;
