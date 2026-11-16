import { Dialog as BaseDialog } from "@base-ui/react/dialog";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../../../components/atoms/button/button";
import * as Dialog from "../../../../components/molecules/dialog/dialog";
import { FormError } from "../../../../components/molecules/form-error/form-error";
import { OneTimeSecret } from "../../../../components/molecules/one-time-secret/one-time-secret";
import { cn } from "../../../../lib/cn";
import { DialogHeading } from "../-shared/dialog-heading";

export type SecretContent = {
  title: string;
  /** That it is shown once, and how long it works. */
  description: string;
  label: string;
  value: string;
  /** What to do once it's lost, or where the person uses it. */
  hint: string;
  /** A link at the footer's start, such as preparing the person's portfolio. */
  start?: ReactNode;
};

/**
 * An access link or a reset key, shown once: what it is, the secret with
 * Copy, what to do once it's lost, then Done. It takes the place of the step
 * that asked for it, so Copy takes the focus.
 */
export function SecretStep({
  title,
  description,
  label,
  value,
  hint,
  start,
}: SecretContent) {
  const { t } = useTranslation();

  return (
    <>
      <DialogHeading>{title}</DialogHeading>
      <Dialog.Description>{description}</Dialog.Description>
      <OneTimeSecret label={label} value={value} focusCopy />
      <p className="text-xs text-secondary">{hint}</p>
      <Dialog.Footer
        className={cn(
          "items-center",
          "",
          start ? "tablet:justify-between" : "",
          start ? "desktop:justify-between" : "",
        )}
      >
        {start}
        <BaseDialog.Close render={<Button intent="primary" />}>
          {t("adminPeople.secret.done")}
        </BaseDialog.Close>
      </Dialog.Footer>
    </>
  );
}

/**
 * A question before an action: what happens next, why it was refused when it
 * was, then Cancel and the action, which loads while it runs.
 */
export function ConfirmStep({
  title,
  description,
  action,
  loadingLabel,
  busy,
  error,
  onConfirm,
}: {
  title: string;
  description: string;
  action: string;
  loadingLabel: string;
  busy: boolean;
  error: string | null;
  onConfirm: () => void;
}) {
  return (
    <>
      <DialogHeading>{title}</DialogHeading>
      <Dialog.Description>{description}</Dialog.Description>
      <FormError>{error}</FormError>
      <Dialog.Footer>
        <Dialog.Cancel />
        <Button
          intent="primary"
          loading={busy}
          loadingLabel={loadingLabel}
          onClick={onConfirm}
        >
          {action}
        </Button>
      </Dialog.Footer>
    </>
  );
}
