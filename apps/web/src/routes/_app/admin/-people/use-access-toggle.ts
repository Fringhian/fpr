import type { AdminPerson } from "@fpr/contracts";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useToast } from "../../../../components/molecules/toast/use-toast";
import { useErrorText } from "../../../../lib/api/errors";
import { useApi } from "../../../../lib/api/use-api";

/**
 * Revoking access at once, with Undo, which restores it, and restoring it.
 * A refusal shows in a toast that stays until dismissed.
 */
export function useAccessToggle() {
  const { t } = useTranslation();
  const api = useApi();
  const toast = useToast();
  const errorText = useErrorText();
  const revoke = useMutation(api.admin.revoke.mutationOptions());
  const restore = useMutation(api.admin.restore.mutationOptions());

  const refused = (error: unknown) =>
    toast.show({
      title: t("adminPeople.access.refused"),
      description: errorText(error),
      timeout: 0,
    });
  const restoreAccess = ({ id, displayName }: AdminPerson) =>
    restore.mutate(
      { id },
      {
        onSuccess: () =>
          toast.show({
            title: t("adminPeople.access.restored"),
            description: displayName,
          }),
        onError: refused,
      },
    );
  const revokeAccess = (person: AdminPerson) =>
    revoke.mutate(
      { id: person.id },
      {
        onSuccess: () =>
          toast.offerUndo({
            title: t("adminPeople.access.revoked"),
            description: person.displayName,
            onUndo: () => restoreAccess(person),
          }),
        onError: refused,
      },
    );

  return { revoke: revokeAccess, restore: restoreAccess };
}
