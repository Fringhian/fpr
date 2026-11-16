import type { Id, PortfolioLogEntry } from "@fpr/contracts";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../components/molecules/toast/use-toast";
import { entryValueOf, useEntryWrites } from "../../../lib/entry-writes";
import { useEntryRefusal } from "./use-entry-refusal";

/**
 * Deletes an entry of `userId`'s log at once, then offers Undo, which records
 * it again. A deletion, or an Undo, that would take a holding below zero is
 * refused, and a toast names the change it would break. `subject` names the
 * entry in the toasts: “Bought 10 World Index ETF, 3 Mar”.
 */
export function useDeleteEntry(userId: Id) {
  const { t } = useTranslation();
  const toast = useToast();
  const refuse = useEntryRefusal();
  const { add, remove } = useEntryWrites();

  // A deleted entry comes back as a new one, the same change on the same moment.
  const undo = (entry: PortfolioLogEntry) =>
    add(userId, crypto.randomUUID(), entryValueOf(entry)).catch(
      (error: unknown) => refuse(t("entryActions.undoRefused"), error),
    );

  return async (entry: PortfolioLogEntry, subject: string) => {
    try {
      await remove(entry);
    } catch (error) {
      refuse(t("entryActions.deleteRefused"), error);
      return;
    }
    toast.offerUndo({
      title: t(`entryActions.deleted.${entry.type}`),
      description: subject,
      onUndo: () => void undo(entry),
    });
  };
}
