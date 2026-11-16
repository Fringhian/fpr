import { Form } from "@base-ui/react/form";
import type { AdminAddPerson, Role } from "@fpr/contracts";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../components/atoms/button/button";
import * as Dialog from "../../../../components/molecules/dialog/dialog";
import { FormError } from "../../../../components/molecules/form-error/form-error";
import { useApi } from "../../../../lib/api/use-api";
import { endOfDay } from "../../../../lib/date-field";
import type { DialogRootState } from "../../../../lib/dialog-state";
import { DisplayNameField, EmailField } from "../../../-account/access-fields";
import { useRefusal } from "../../../-account/use-refusal";
import { DialogHeading } from "../-shared/dialog-heading";
import { useAccessSecrets } from "./access-secrets";
import { type SecretContent, SecretStep } from "./dialog-steps";
import { EndDateField } from "./person-fields";

type AddValues = { displayName: string; email?: string; accessUntil: string };

const blame = { email_taken: "email" } as const;

/** The new person's name, email (none for an anonymous viewer) and end date, then Create access link. */
function AddForm({
  role,
  onAdded,
}: {
  role: Role;
  onAdded: (secret: SecretContent) => void;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const secrets = useAccessSecrets();
  const add = useMutation(api.admin.addPerson.mutationOptions());
  const { errors, formError, refuseError } = useRefusal(blame);

  const submit = ({ displayName, email = "", accessUntil }: AddValues) => {
    const fields = {
      displayName: displayName.trim(),
      accessUntil: endOfDay(accessUntil),
    };
    const input: AdminAddPerson =
      role === "anonymous"
        ? { ...fields, role }
        : { ...fields, role, email: email.trim() };
    add.mutate(input, {
      onSuccess: (added) => onAdded(secrets.link(added, { replaced: false })),
      onError: refuseError,
    });
  };

  return (
    <Form<AddValues> errors={errors} onFormSubmit={submit} className="contents">
      <DialogHeading>{t(`adminPeople.add.${role}`)}</DialogHeading>
      {role === "anonymous" ? (
        <Dialog.Description>
          {t("adminPeople.addDialog.anonymous")}
        </Dialog.Description>
      ) : null}
      <DisplayNameField
        label={t("adminPeople.fields.name")}
        autoComplete="off"
      />
      {role === "anonymous" ? null : <EmailField autoComplete="off" />}
      <EndDateField />
      <FormError>{formError}</FormError>
      <Dialog.Footer>
        <Button
          type="submit"
          intent="primary"
          loading={add.isPending}
          loadingLabel={t("adminPeople.secret.creating")}
        >
          {t("adminPeople.addDialog.create")}
        </Button>
      </Dialog.Footer>
    </Form>
  );
}

/**
 * Adding a person in `role`: the form, then their access link in its place,
 * shown once. Once the link shows, a press on the dimmed page no longer
 * closes the dialog.
 */
export function AddPersonDialog({
  role,
  root,
}: {
  role: Role;
  root: DialogRootState;
}) {
  const [secret, setSecret] = useState<SecretContent | null>(null);

  return (
    <Dialog.Root {...root} disablePointerDismissal={secret !== null}>
      <Dialog.Popup>
        {secret === null ? (
          <AddForm role={role} onAdded={setSecret} />
        ) : (
          <SecretStep {...secret} />
        )}
      </Dialog.Popup>
    </Dialog.Root>
  );
}
