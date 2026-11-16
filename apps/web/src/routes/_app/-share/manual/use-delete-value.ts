import type { Id, ShareValue } from "@fpr/contracts";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../../components/molecules/toast/use-toast";
import { changedValue, type ValueConflict } from "../../../../lib/api/errors";
import { useApi } from "../../../../lib/api/use-api";
import { useRefusedToast } from "../../../../lib/api/use-refused-toast";

/** A deletion the API refused because the value changed: the value, the price it has now, and who entered it. */
export type ChangedValue = { value: ShareValue } & ValueConflict;

/**
 * Deletes a manual share's value point at once, then offers Undo, which adds
 * it again. A value someone changed in the meantime isn't deleted: `changed`
 * holds it with its new price until `confirm` deletes it over that price or
 * `dismiss` keeps it. Any other refusal shows in a toast. `subjectOf` names
 * a value in the toasts: “€40.10, 3 Mar”.
 */
export function useDeleteValue(
  shareId: Id,
  subjectOf: (value: ShareValue) => string,
) {
  const { t } = useTranslation();
  const toast = useToast();
  const refuse = useRefusedToast();
  const api = useApi();
  const remove = useMutation(api.shares.deleteValue.mutationOptions());
  const add = useMutation(api.shares.addValue.mutationOptions());
  const [changed, setChanged] = useState<ChangedValue | null>(null);

  const undo = (value: ShareValue) =>
    add
      .mutateAsync({ id: shareId, at: value.at, priceEur: value.priceEur })
      .catch((error: unknown) => refuse(t("valueActions.undoRefused"), error));

  // Deletes the value over the price `value` holds; whether it is deleted.
  const run = async (value: ShareValue) => {
    try {
      await remove.mutateAsync({
        id: shareId,
        at: value.at,
        expectedPriceEur: value.priceEur,
      });
    } catch (error) {
      const conflict = changedValue(error);
      if (conflict === null) refuse(t("valueActions.deleteRefused"), error);
      else setChanged({ value, ...conflict });
      return false;
    }
    setChanged(null);
    toast.offerUndo({
      title: t("valueActions.deleted"),
      description: subjectOf(value),
      onUndo: () => void undo(value),
    });
    return true;
  };

  return {
    remove: run,
    changed,
    /** Deletes the changed value over its new price; rejects while it isn't deleted, which keeps the confirmation open. */
    confirm: async () => {
      if (changed === null) return;
      if (!(await run({ ...changed.value, priceEur: changed.priceEur }))) {
        throw new Error("The value isn't deleted");
      }
    },
    dismiss: () => setChanged(null),
  };
}
