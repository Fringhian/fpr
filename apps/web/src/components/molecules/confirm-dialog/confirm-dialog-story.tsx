import type { Language } from "@fpr/contracts";
import { type ReactNode, useState } from "react";
import { cn } from "../../../lib/cn";
import { useLanguage } from "../../../lib/i18n";
import { Button } from "../../atoms/button/button";
import * as Field from "../field/field";
import * as ConfirmDialog from "./confirm-dialog";

/** The demo texts, in the toolbar’s language. They are the stories’ content, not the dialog’s. */
export const TEXTS = {
  en: {
    open: "Delete this change",
    title: "Delete this change?",
    description:
      "Bought 10 World Index ETF on 3 March. Your history and the race no longer count it.",
    confirm: "Delete change",
    deleting: "Deleting…",
    deleted: "The change is deleted.",
    openPerson: "Delete Max",
    personTitle: "Delete Max?",
    personDescription:
      "Max’s share changes and cash balances are deleted with him. Manual shares and values he entered stay.",
    typeName: "Type Max to confirm",
    personDeleted: "Max is deleted.",
  },
  fr: {
    open: "Supprimer ce mouvement",
    title: "Supprimer ce mouvement ?",
    description:
      "Achat de 10 World Index ETF le 3 mars. Votre historique et la course ne le comptent plus.",
    confirm: "Supprimer le mouvement",
    deleting: "Suppression…",
    deleted: "Le mouvement est supprimé.",
    openPerson: "Supprimer Max",
    personTitle: "Supprimer Max ?",
    personDescription:
      "Les mouvements et les liquidités de Max sont supprimés avec lui. Les titres manuels et les valeurs qu’il a saisis restent.",
    typeName: "Saisissez Max pour confirmer",
    personDeleted: "Max est supprimé.",
  },
} as const satisfies Record<Language, Record<string, string>>;

/** How long the demo's action takes, in ms: long enough to see the button load. */
const ACTION_MS = 600;

const wait = () => new Promise((resolve) => setTimeout(resolve, ACTION_MS));

/** The page behind the overlay, with what the story's action did under it. */
export function Page({ children }: { children: ReactNode }) {
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

/** Deleting a change with `ConfirmDialog.Basic`, its action taking a moment. */
export function DeleteChange({
  intent,
  description,
}: {
  intent: "danger" | "primary";
  description: boolean;
}) {
  const text = TEXTS[useLanguage()];
  const [deleted, setDeleted] = useState(false);

  return (
    <Page>
      <ConfirmDialog.Basic
        trigger={<Button>{text.open}</Button>}
        title={text.title}
        {...(description ? { description: text.description } : {})}
        confirmLabel={text.confirm}
        loadingLabel={text.deleting}
        intent={intent}
        onConfirm={async () => {
          await wait();
          setDeleted(true);
        }}
      />
      {deleted ? <p className="text-s text-secondary">{text.deleted}</p> : null}
    </Page>
  );
}

/** Deleting a person: the parts composed with a field, and the action waits for the name. */
export function DeletePerson() {
  const text = TEXTS[useLanguage()];
  const [name, setName] = useState("");
  const [deleted, setDeleted] = useState(false);

  return (
    <Page>
      <ConfirmDialog.Root onOpenChangeComplete={() => setName("")}>
        <ConfirmDialog.Trigger render={<Button intent="danger" />}>
          {text.openPerson}
        </ConfirmDialog.Trigger>
        <ConfirmDialog.Popup>
          <ConfirmDialog.Header>
            <ConfirmDialog.Title>{text.personTitle}</ConfirmDialog.Title>
            <ConfirmDialog.Close />
          </ConfirmDialog.Header>
          <ConfirmDialog.Description>
            {text.personDescription}
          </ConfirmDialog.Description>
          <Field.Root>
            <Field.Label>{text.typeName}</Field.Label>
            <Field.Control
              value={name}
              onValueChange={setName}
              autoComplete="off"
            />
          </Field.Root>
          <ConfirmDialog.Footer>
            <ConfirmDialog.Cancel />
            <ConfirmDialog.Confirm
              disabled={name.trim() !== "Max"}
              loadingLabel={text.deleting}
              onConfirm={async () => {
                await wait();
                setDeleted(true);
              }}
            >
              {text.openPerson}
            </ConfirmDialog.Confirm>
          </ConfirmDialog.Footer>
        </ConfirmDialog.Popup>
      </ConfirmDialog.Root>
      {deleted ? (
        <p className="text-s text-secondary">{text.personDeleted}</p>
      ) : null}
    </Page>
  );
}
