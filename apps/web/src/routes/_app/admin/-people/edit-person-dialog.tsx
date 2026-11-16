import { Form } from "@base-ui/react/form";
import type { AdminPerson, Role } from "@fpr/contracts";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../components/atoms/button/button";
import * as Dialog from "../../../../components/molecules/dialog/dialog";
import { FormError } from "../../../../components/molecules/form-error/form-error";
import { useToast } from "../../../../components/molecules/toast/use-toast";
import { useApi } from "../../../../lib/api/use-api";
import { dayOf } from "../../../../lib/date-field";
import type { DialogRootState } from "../../../../lib/dialog-state";
import { DisplayNameField, EmailField } from "../../../-account/access-fields";
import { useRefusal } from "../../../-account/use-refusal";
import { DialogHeading } from "../-shared/dialog-heading";
import { changesOf } from "./people-model";
import { EndDateField, RoleField } from "./person-fields";

type EditValues = { displayName: string; email?: string; accessUntil?: string };

const blame = { email_taken: "email" } as const;

/** Why a field is locked: the last admin keeps their role and access, and a person with a portfolio can't become a guest. */
function useLocks(person: AdminPerson, lastAdmin: boolean) {
  const { t } = useTranslation();

  const name = person.displayName;
  return {
    lastAdmin: lastAdmin
      ? t("adminPeople.edit.lastAdmin", { name })
      : undefined,
    endDate: lastAdmin ? t("adminPeople.edit.lastAdminEnd") : undefined,
    guest: person.hasPortfolioEntries
      ? t("adminPeople.edit.hasPortfolio", { name })
      : undefined,
  };
}

/**
 * Sends what the form changed, then says so in a toast and closes; with no
 * change, it only closes. A refusal shows under its field, or the form.
 */
function useSave(person: AdminPerson, onSaved: () => void) {
  const { t } = useTranslation();
  const api = useApi();
  const toast = useToast();
  const update = useMutation(api.admin.updatePerson.mutationOptions());
  const { errors, formError, refuseError } = useRefusal(blame);

  const save = (values: EditValues & { role: Role }) => {
    const changes = changesOf(person, values);
    if (Object.keys(changes).length === 0) {
      onSaved();
      return;
    }
    update.mutate(
      { id: person.id, ...changes },
      {
        onSuccess: (saved) => {
          toast.show({
            title: t("adminPeople.edit.saved"),
            description: saved.displayName,
          });
          onSaved();
        },
        onError: refuseError,
      },
    );
  };

  return { save, saving: update.isPending, errors, formError };
}

/** The person's name, email, role and end date, each prefilled; Save changes sends what changed. */
function EditForm({
  person,
  lastAdmin,
  onSaved,
}: {
  person: AdminPerson;
  lastAdmin: boolean;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const [role, setRole] = useState<Role>(person.role);
  const locks = useLocks(person, lastAdmin);
  const { save, saving, errors, formError } = useSave(person, onSaved);

  const anonymous = person.role === "anonymous";

  return (
    <Form<EditValues>
      errors={errors}
      onFormSubmit={(values) => save({ ...values, role })}
      className="contents"
    >
      <DialogHeading>
        {t("adminPeople.edit.title", { name: person.displayName })}
      </DialogHeading>
      <DisplayNameField
        label={t("adminPeople.fields.name")}
        defaultValue={person.displayName}
        autoComplete="off"
      />
      {anonymous ? null : (
        <EmailField
          autoComplete="off"
          defaultValue={person.email ?? undefined}
        />
      )}
      {anonymous ? null : (
        <RoleField
          value={role}
          onValueChange={setRole}
          reason={locks.lastAdmin}
          guestReason={locks.guest}
        />
      )}
      <EndDateField
        defaultValue={dayOf(person.accessUntil)}
        reason={locks.endDate}
      />
      <FormError>{formError}</FormError>
      <Dialog.Footer>
        <Dialog.Cancel />
        <Button type="submit" intent="primary" loading={saving}>
          {t("adminPeople.edit.save")}
        </Button>
      </Dialog.Footer>
    </Form>
  );
}

/** Edit: a person's display name, email, role and end date, with the rules that hold them. */
export function EditPersonDialog({
  person,
  lastAdmin,
  root,
}: {
  person: AdminPerson;
  lastAdmin: boolean;
  root: DialogRootState;
}) {
  return (
    <Dialog.Root {...root}>
      <Dialog.Popup>
        <EditForm
          person={person}
          lastAdmin={lastAdmin}
          onSaved={() => root.onOpenChange(false)}
        />
      </Dialog.Popup>
    </Dialog.Root>
  );
}
