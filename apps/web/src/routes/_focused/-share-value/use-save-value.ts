import type { Id, ShareValue, Timestamp } from "@fpr/contracts";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../components/molecules/toast/use-toast";
import { priceIn } from "../../../lib/amount";
import {
  changedValue,
  useErrorText,
  type ValueConflict,
} from "../../../lib/api/errors";
import { useApi } from "../../../lib/api/use-api";
import { useLanguage } from "../../../lib/i18n";
import { isFuture, momentOf, type ValueDraft } from "./value-draft";

/**
 * Saves the value typed: a new value point at the draft's moment, or, with
 * `editing`, that value point's new price. Once saved it says so and goes
 * back to the share's page.
 *
 * Two people editing the same value: the API refuses a price set over one
 * the editor didn't see, and `changed` holds the price there now and who
 * entered it; saving
 * again confirms the typed price over it. A new value at a moment that has
 * one already is refused, and `taken` holds the value there.
 */
export function useSaveValue(shareId: Id, editing: ShareValue | undefined) {
  const { t } = useTranslation();
  const language = useLanguage();
  const errorText = useErrorText();
  const toast = useToast();
  const navigate = useNavigate();
  const api = useApi();
  const add = useMutation(api.shares.addValue.mutationOptions());
  const update = useMutation(api.shares.updateValue.mutationOptions());
  const [changed, setChanged] = useState<ValueConflict | null>(null);
  const [taken, setTaken] = useState<ShareValue | null>(null);

  const done = {
    onSuccess: () => {
      toast.show({ title: t("valueForm.saved") });
      void navigate({
        to: "/shares/$shareId",
        params: { shareId },
        ignoreBlocker: true,
      });
    },
  };
  const write = editing ? update : add;
  const conflict = changedValue(write.error) !== null;

  const save = (draft: ValueDraft) => {
    const priceEur = priceIn(draft.price, language);
    if (priceEur === null) return;
    if (editing) {
      const expectedPriceEur = changed?.priceEur ?? editing.priceEur;
      update.mutate(
        { id: shareId, at: editing.at, priceEur, expectedPriceEur },
        {
          ...done,
          onError: (error) => setChanged(changedValue(error) ?? changed),
        },
      );
      return;
    }
    const at: Timestamp | null = momentOf(draft.day, draft.time);
    if (at === null || isFuture(draft.day, draft.time)) return;
    add.mutate(
      { id: shareId, at, priceEur },
      {
        ...done,
        onError: (error) => {
          const there = changedValue(error);
          setTaken(
            there === null
              ? null
              : { at, priceEur: there.priceEur, enteredBy: null },
          );
        },
      },
    );
  };

  return {
    save,
    pending: write.isPending,
    saved: write.isSuccess,
    changed,
    taken,
    refusal: write.isError && !conflict ? errorText(write.error) : null,
    reset: () => {
      if (write.isError) write.reset();
      setTaken(null);
    },
  };
}
