import { Form } from "@base-ui/react/form";
import type { ShareDetail } from "@fpr/contracts";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../components/atoms/button/button";
import { TextLink } from "../../../../components/atoms/text-link/text-link";
import * as Dialog from "../../../../components/molecules/dialog/dialog";
import { FormError } from "../../../../components/molecules/form-error/form-error";
import { useToast } from "../../../../components/molecules/toast/use-toast";
import { isinTakenBy, useErrorText } from "../../../../lib/api/errors";
import { useApi } from "../../../../lib/api/use-api";
import { isinIn } from "../../../../lib/isin";
import { IsinField, NameField } from "../../../-share-fields/share-fields";

/** Saves the share's name and ISIN as typed, then says so; `refusal` is why the API refused them. */
function useUpdateShare(share: ShareDetail, onDone: () => void) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const toast = useToast();
  const api = useApi();
  const update = useMutation(api.shares.update.mutationOptions());

  const takenBy = isinTakenBy(update.error);
  return {
    save: (draft: { name: string; isin: string }) => {
      const isin = isinIn(draft.isin);
      const name = draft.name.trim();
      if (isin === null || name === "") return;
      update.mutate(
        { id: share.id, name, isin },
        {
          onSuccess: () => {
            toast.show({ title: t("editShare.saved") });
            onDone();
          },
        },
      );
    },
    pending: update.isPending,
    takenBy,
    refusal: takenBy
      ? t("shareLookup.isinTaken")
      : update.isError
        ? errorText(update.error)
        : null,
    reset: () => update.reset(),
  };
}

/** The dialog's form: the ISIN, the name, the refusal, then Cancel and Save changes. */
function EditForm({
  share,
  onDone,
}: {
  share: ShareDetail;
  onDone: () => void;
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState({ name: share.name, isin: share.isin });
  const update = useUpdateShare(share, onDone);

  const change = (patch: Partial<typeof draft>) => {
    setDraft((previous) => ({ ...previous, ...patch }));
    if (update.refusal) update.reset();
  };

  return (
    <Form
      className="grid gap-m"
      errors={update.takenBy && update.refusal ? { isin: update.refusal } : {}}
      onFormSubmit={() => update.save(draft)}
    >
      <IsinField
        value={draft.isin}
        onValueChange={(isin) => change({ isin })}
        takenLink={
          update.takenBy === null ? null : (
            <Link to="/shares/$shareId" params={{ shareId: update.takenBy }} />
          )
        }
      />
      <NameField
        value={draft.name}
        onValueChange={(name) => change({ name })}
      />
      <FormError>{update.takenBy ? null : update.refusal}</FormError>
      <Dialog.Footer>
        <Dialog.Cancel />
        <Button
          type="submit"
          intent="primary"
          loading={update.pending}
          loadingLabel={t("editShare.saving")}
        >
          {t("editShare.save")}
        </Button>
      </Dialog.Footer>
    </Form>
  );
}

/**
 * Edit name or ISIN, beside a manual share's ISIN: a dialog with both, an
 * ISIN another share has refused with a link to that share.
 */
export function EditShare({ share }: { share: ShareDetail }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={
          <TextLink render={<button type="button" />} className="text-s" />
        }
      >
        {t("editShare.open")}
      </Dialog.Trigger>
      <Dialog.Popup>
        <Dialog.Header>
          <Dialog.Title>{t("editShare.title")}</Dialog.Title>
          <Dialog.Close />
        </Dialog.Header>
        <Dialog.Description>{t("editShare.description")}</Dialog.Description>
        {open ? <EditForm share={share} onDone={() => setOpen(false)} /> : null}
      </Dialog.Popup>
    </Dialog.Root>
  );
}
