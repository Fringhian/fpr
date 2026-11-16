import type { AdminPerson } from "@fpr/contracts";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import * as ConfirmDialog from "../../../../components/molecules/confirm-dialog/confirm-dialog";
import * as Field from "../../../../components/molecules/field/field";
import { FormError } from "../../../../components/molecules/form-error/form-error";
import { useToast } from "../../../../components/molecules/toast/use-toast";
import { useErrorText } from "../../../../lib/api/errors";
import { useApi } from "../../../../lib/api/use-api";
import type { DialogRootState } from "../../../../lib/dialog-state";
import { hasPortfolio } from "./people-model";

/**
 * Deletes the person, then says so in a toast. A refusal is kept to show in
 * the dialog, and rethrown so the dialog stays open.
 */
function useDeletePerson(person: AdminPerson) {
  const { t } = useTranslation();
  const api = useApi();
  const toast = useToast();
  const errorText = useErrorText();
  const remove = useMutation(api.admin.deletePerson.mutationOptions());
  const [error, setError] = useState<string | null>(null);

  const confirm = async () => {
    setError(null);
    try {
      await remove.mutateAsync({ id: person.id });
    } catch (refusal) {
      setError(errorText(refusal));
      throw refusal;
    }
    toast.show({
      title: t("adminPeople.delete.deleted"),
      description: person.displayName,
    });
  };

  return { confirm, error };
}

/**
 * Delete: what goes with the person, then their name typed to confirm.
 * Delete stays disabled until the name matches, and a refusal stays in the
 * dialog.
 */
export function DeletePersonDialog({
  person,
  root,
}: {
  person: AdminPerson;
  root: DialogRootState;
}) {
  const { t } = useTranslation();
  const { confirm, error } = useDeletePerson(person);
  const [typed, setTyped] = useState("");
  const field = useRef<HTMLInputElement>(null);

  const name = person.displayName;

  return (
    <ConfirmDialog.Root {...root}>
      <ConfirmDialog.Popup initialFocus={field}>
        <ConfirmDialog.Header>
          <ConfirmDialog.Title>
            {t("adminPeople.delete.title", { name })}
          </ConfirmDialog.Title>
          <ConfirmDialog.Close />
        </ConfirmDialog.Header>
        <ConfirmDialog.Description>
          {hasPortfolio(person.role)
            ? t("adminPeople.delete.withPortfolio", { name })
            : t("adminPeople.delete.withoutPortfolio", { name })}
        </ConfirmDialog.Description>
        <Field.Root>
          <Field.Label>
            {t("adminPeople.delete.typeName", { name })}
          </Field.Label>
          <Field.Control
            ref={field}
            name="typedName"
            value={typed}
            onValueChange={setTyped}
            autoComplete="off"
            spellCheck={false}
          />
        </Field.Root>
        <FormError>{error}</FormError>
        <ConfirmDialog.Footer>
          <ConfirmDialog.Cancel />
          <ConfirmDialog.Confirm
            disabled={typed.trim() !== name}
            loadingLabel={t("adminPeople.delete.deleting")}
            onConfirm={confirm}
          >
            {t("adminPeople.delete.action", { name })}
          </ConfirmDialog.Confirm>
        </ConfirmDialog.Footer>
      </ConfirmDialog.Popup>
    </ConfirmDialog.Root>
  );
}
