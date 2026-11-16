import type { AdminShare } from "@fpr/contracts";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import * as ConfirmDialog from "../../../../components/molecules/confirm-dialog/confirm-dialog";
import { useToast } from "../../../../components/molecules/toast/use-toast";
import { useApi } from "../../../../lib/api/use-api";
import { useRefusedToast } from "../../../../lib/api/use-refused-toast";
import type { DialogRootState } from "../../../../lib/dialog-state";

/**
 * Delete a share nobody has held: it leaves FPR's list of shares. A refusal,
 * such as a share someone has just recorded, keeps the dialog open and says
 * why in a toast.
 */
export function DeleteShareDialog({
  share,
  root,
}: {
  share: AdminShare;
  root: DialogRootState;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const toast = useToast();
  const refused = useRefusedToast();
  const remove = useMutation(api.shares.delete.mutationOptions());

  const confirm = async () => {
    try {
      await remove.mutateAsync({ id: share.id });
    } catch (refusal) {
      refused(t("adminShares.delete.refused"), refusal);
      throw refusal;
    }
    toast.show({
      title: t("adminShares.delete.deleted"),
      description: share.name,
    });
  };

  return (
    <ConfirmDialog.Basic
      {...root}
      title={t("adminShares.delete.title", { name: share.name })}
      description={t("adminShares.delete.description")}
      confirmLabel={t("adminShares.delete.action")}
      loadingLabel={t("adminShares.delete.deleting")}
      onConfirm={confirm}
    />
  );
}
