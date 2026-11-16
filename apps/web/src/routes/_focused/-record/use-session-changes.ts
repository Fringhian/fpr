import { useState } from "react";
import { useTranslation } from "react-i18next";
import { entryValueOf, useEntryWrites } from "../../../lib/entry-writes";
import type { SavedEntry } from "../../../lib/log-entry";
import { useEntryRefusal } from "../../_app/-portfolio-sections/use-entry-refusal";

/** A change saved in this sitting: the entry, and what it was before an edit. */
export type SavedChange = {
  entry: SavedEntry;
  /** The entry before an edit, or `null` for a new one. */
  previous: SavedEntry | null;
  undone: boolean;
  busy: boolean;
};

/**
 * The changes saved in this sitting of Record a change, oldest first, each
 * with Undo. An Undo that would take a holding below zero is refused, and a
 * toast names the change it would break. They live as long as the flow's
 * page: leaving it ends the sitting, and the changes stay saved.
 */
export function useSessionChanges() {
  const { t } = useTranslation();
  const refuse = useEntryRefusal();
  const writes = useEntryWrites();
  const [items, setItems] = useState<readonly SavedChange[]>([]);

  // Undo deletes a new entry, or puts an edited one back as it was.
  const revert = ({ entry, previous }: SavedChange) =>
    previous === null
      ? writes.remove(entry)
      : writes.update(entry.id, entryValueOf(previous));

  const patch = (id: string, change: Partial<SavedChange>) =>
    setItems((all) =>
      all.map((item) => (item.entry.id === id ? { ...item, ...change } : item)),
    );

  return {
    items,
    last: items.at(-1),
    /** Adds a change just saved; one saved again, by a second press, keeps its place. */
    add: (entry: SavedEntry, previous: SavedEntry | null) =>
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
