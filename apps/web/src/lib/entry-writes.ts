import type { Decimal, Id, PortfolioLogEntry, Timestamp } from "@fpr/contracts";
import { useMutation } from "@tanstack/react-query";
import { useApi } from "./api/use-api";

/** A log entry's value, as a write sends it. */
export type EntryValue =
  | { type: "cash"; amountEur: Decimal; effectiveAt: Timestamp }
  | {
      type: "change";
      shareId: Id;
      quantityDelta: Decimal;
      effectiveAt: Timestamp;
    };

export function entryValueOf(entry: PortfolioLogEntry): EntryValue {
  return entry.type === "cash"
    ? {
        type: "cash",
        amountEur: entry.amountEur,
        effectiveAt: entry.effectiveAt,
      }
    : {
        type: "change",
        shareId: entry.share.id,
        quantityDelta: entry.quantityDelta,
        effectiveAt: entry.effectiveAt,
      };
}

/**
 * The writes to a member's log: `add` a share change or cash balance under a
 * client id, `update` one to a new value, `remove` one; `pending` while one
 * is under way. Each invalidates the reads it changes.
 */
export function useEntryWrites() {
  const api = useApi();
  const addChange = useMutation(api.portfolio.addChange.mutationOptions());
  const setCash = useMutation(api.portfolio.setCash.mutationOptions());
  const updateChange = useMutation(
    api.portfolio.updateChange.mutationOptions(),
  );
  const updateCash = useMutation(api.portfolio.updateCash.mutationOptions());
  const deleteChange = useMutation(
    api.portfolio.deleteChange.mutationOptions(),
  );
  const deleteCash = useMutation(api.portfolio.deleteCash.mutationOptions());

  const all = [addChange, setCash, updateChange, updateCash];
  return {
    pending: all.some((write) => write.isPending),
    add: (
      userId: Id,
      id: Id,
      value: EntryValue,
    ): Promise<PortfolioLogEntry> => {
      const { effectiveAt } = value;
      return value.type === "cash"
        ? setCash.mutateAsync({
            userId,
            id,
            amountEur: value.amountEur,
            effectiveAt,
          })
        : addChange.mutateAsync({
            userId,
            id,
            shareId: value.shareId,
            quantityDelta: value.quantityDelta,
            effectiveAt,
          });
    },
    update: (id: Id, value: EntryValue): Promise<PortfolioLogEntry> => {
      const { effectiveAt } = value;
      return value.type === "cash"
        ? updateCash.mutateAsync({
            id,
            amountEur: value.amountEur,
            effectiveAt,
          })
        : updateChange.mutateAsync({
            id,
            quantityDelta: value.quantityDelta,
            effectiveAt,
          });
    },
    remove: ({ type, id }: PortfolioLogEntry): Promise<unknown> =>
      type === "cash"
        ? deleteCash.mutateAsync({ id })
        : deleteChange.mutateAsync({ id }),
  };
}
