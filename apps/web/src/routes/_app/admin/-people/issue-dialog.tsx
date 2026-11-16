import { useState } from "react";
import { useTranslation } from "react-i18next";
import * as Dialog from "../../../../components/molecules/dialog/dialog";
import { useErrorText } from "../../../../lib/api/errors";
import type { DialogRootState } from "../../../../lib/dialog-state";
import { ConfirmStep, type SecretContent, SecretStep } from "./dialog-steps";

/**
 * A dialog that creates a secret, such as a new access link or a reset key:
 * it asks first, then shows the secret once in its place. A press on the
 * dimmed page doesn't close it, so the secret isn't lost by a stray click.
 */
export function IssueDialog({
  root,
  title,
  description,
  action,
  issue,
}: {
  root: DialogRootState;
  title: string;
  description: string;
  action: string;
  /** Creates the secret, and gives what the dialog shows of it. */
  issue: () => Promise<SecretContent>;
}) {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const [secret, setSecret] = useState<SecretContent | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setSecret(await issue());
    } catch (refusal) {
      setError(errorText(refusal));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog.Root {...root} disablePointerDismissal>
      <Dialog.Popup>
        {secret === null ? (
          <ConfirmStep
            title={title}
            description={description}
            action={action}
            loadingLabel={t("adminPeople.secret.creating")}
            busy={busy}
            error={error}
            onConfirm={() => void run()}
          />
        ) : (
          <SecretStep {...secret} />
        )}
      </Dialog.Popup>
    </Dialog.Root>
  );
}
