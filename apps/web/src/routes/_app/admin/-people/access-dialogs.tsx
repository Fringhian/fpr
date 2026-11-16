import type { AdminPerson } from "@fpr/contracts";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useApi } from "../../../../lib/api/use-api";
import type { DialogRootState } from "../../../../lib/dialog-state";
import { useAccessSecrets } from "./access-secrets";
import { IssueDialog } from "./issue-dialog";

type AccessDialogProps = { person: AdminPerson; root: DialogRootState };

/** Replace link: the current link stops working, and the new one shows once. */
export function ReplaceLinkDialog({ person, root }: AccessDialogProps) {
  const { t } = useTranslation();
  const api = useApi();
  const secrets = useAccessSecrets();
  const replace = useMutation(api.admin.replaceLink.mutationOptions());

  const name = person.displayName;

  return (
    <IssueDialog
      root={root}
      title={t("adminPeople.replace.title", { name })}
      description={t("adminPeople.replace.description", { name })}
      action={t("adminPeople.replace.action")}
      issue={async () =>
        secrets.link(await replace.mutateAsync({ id: person.id }), {
          replaced: true,
        })
      }
    />
  );
}

/** Reset password: a reset key for the person, shown once. */
export function ResetKeyDialog({ person, root }: AccessDialogProps) {
  const { t } = useTranslation();
  const api = useApi();
  const secrets = useAccessSecrets();
  const reset = useMutation(api.admin.resetKey.mutationOptions());

  const name = person.displayName;

  return (
    <IssueDialog
      root={root}
      title={t("adminPeople.resetKey.title", { name })}
      description={t("adminPeople.resetKey.description", { name })}
      action={t("adminPeople.resetKey.action")}
      issue={async () =>
        secrets.resetKey(person, await reset.mutateAsync({ id: person.id }))
      }
    />
  );
}
