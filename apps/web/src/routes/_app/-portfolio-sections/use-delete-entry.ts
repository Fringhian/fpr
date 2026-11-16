import type { Id, PortfolioLogEntry } from "@fpr/contracts";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../components/molecules/toast/use-toast";
import { useApi } from "../../../lib/api/use-api";
import { useEntryRefusal } from "./use-entry-refusal";

/** The writes that delete an entry of `userId`'s log, and put one back. */
function useEntryWrites(userId: Id) {
  const api = useApi();
  const deleteChange = useMutation(
    api.portfolio.deleteChange.mutationOptions(),
  );
  const deleteCash = useMutation(api.portfolio.deleteCash.mutationOptions());
  const addChange = useMutation(api.portfolio.addChange.mutationOptions());
  const setCash = useMutation(api.portfolio.setCash.mutationOptions());

  return {
    remove: ({ type, id }: PortfolioLogEntry) =>
      type === "cash"
        ? deleteCash.mutateAsync({ id })
        : deleteChange.mutateAsync({ id }),
    // A deleted entry comes back as a new one, the same change on the same moment.
    restore: async (entry: PortfolioLogEntry) => {
      const { effectiveAt } = entry;
      const id = crypto.randomUUID();
      await (entry.type === "cash"
        ? setCash.mutateAsync({
            userId,
            id,
            amountEur: entry.amountEur,
            effectiveAt,
          })
        : addChange.mutateAsync({
            userId,
            id,
            shareId: entry.share.id,
            quantityDelta: entry.quantityDelta,
            effectiveAt,
          }));
    },
  };
}

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
  const { remove, restore } = useEntryWrites(userId);

  const undo = (entry: PortfolioLogEntry) =>
    restore(entry).catch((error: unknown) =>
      refuse(t("entryActions.undoRefused"), error),
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
