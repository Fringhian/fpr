import type { Language } from "@fpr/contracts";
import { TrashIcon } from "@phosphor-icons/react/Trash";
import { type ReactNode, useEffect, useState } from "react";
import { cn } from "../../../lib/cn";
import { useLanguage } from "../../../lib/i18n";
import { Button } from "../../atoms/button/button";
import { IconButton } from "../../atoms/icon-button/icon-button";
import { useToast } from "./use-toast";

/** The demo texts, in the toolbar’s language. They are the stories’ content, not the toast’s. */
export const TEXTS = {
  en: {
    changes: [
      "Bought 10 World Index ETF",
      "Sold 4 Euro Bank SA",
      "Cash balance €2,400",
    ],
    delete: "Delete",
    deleted: "Change deleted",
    saved: "Change saved",
    savedDetail: "Bought 10 World Index ETF on 3 March",
    copied: "Access link copied",
    save: "Save change",
  },
  fr: {
    changes: [
      "Achat de 10 World Index ETF",
      "Vente de 4 Euro Bank SA",
      "Liquidités 2 400 €",
    ],
    delete: "Supprimer",
    deleted: "Mouvement supprimé",
    saved: "Mouvement enregistré",
    savedDetail: "Achat de 10 World Index ETF le 3 mars",
    copied: "Lien d’accès copié",
    save: "Enregistrer le mouvement",
  },
} as const satisfies Record<
  Language,
  Record<string, string | readonly string[]>
>;

function Page({ children }: { children?: ReactNode }) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-m font-sans text-primary",
        "p-m",
        "tablet:p-l",
        "desktop:p-l",
      )}
    >
      {children}
    </div>
  );
}

/** A short list of changes: deleting one happens at once and offers Undo, which puts it back. */
export function DeleteWithUndo() {
  const text = TEXTS[useLanguage()];
  const toast = useToast();
  const [deleted, setDeleted] = useState<ReadonlySet<number>>(new Set());

  const toggle = (index: number, gone: boolean) =>
    setDeleted((current) => {
      const next = new Set(current);
      if (gone) next.add(index);
      else next.delete(index);
      return next;
    });

  return (
    <Page>
      <ul className="flex w-full max-w-[24rem] flex-col gap-s">
        {text.changes.map((change, index) =>
          deleted.has(index) ? null : (
            <li
              key={change}
              className="flex items-center justify-between gap-s rounded-card bg-surface py-s ps-m pe-s text-s shadow-outline"
            >
              {change}
              <IconButton
                icon={TrashIcon}
                label={`${text.delete} · ${change}`}
                onClick={() => {
                  toggle(index, true);
                  toast.offerUndo({
                    title: text.deleted,
                    onUndo: () => toggle(index, false),
                  });
                }}
              />
            </li>
          ),
        )}
      </ul>
    </Page>
  );
}

/** Every kind at once, kept until dismissed: a message, one with a second line, and one with Undo. */
export function EveryKind() {
  const text = TEXTS[useLanguage()];
  const toast = useToast();

  useEffect(() => {
    const ids = [
      toast.show({ title: text.copied, timeout: 0 }),
      toast.show({
        title: text.saved,
        description: text.savedDetail,
        timeout: 0,
      }),
      toast.offerUndo({ title: text.deleted, onUndo: () => {}, timeout: 0 }),
    ];
    return () => {
      for (const id of ids) toast.close(id);
    };
  }, [toast, text]);

  return <Page />;
}

/** Saving shows a message that goes by itself after `timeout` ms. */
export function SaveChange({ timeout }: { timeout: number }) {
  const text = TEXTS[useLanguage()];
  const toast = useToast();

  return (
    <Page>
      <Button
        intent="primary"
        onClick={() => toast.show({ title: text.saved, timeout })}
      >
        {text.save}
      </Button>
    </Page>
  );
}
