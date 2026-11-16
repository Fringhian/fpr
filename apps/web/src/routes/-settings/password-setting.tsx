import { Collapsible } from "@base-ui/react/collapsible";
import { Form } from "@base-ui/react/form";
import { CaretDownIcon } from "@phosphor-icons/react/CaretDown";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "../../components/atoms/button/button";
import { Icon } from "../../components/foundations/icon/icon";
import { FormError } from "../../components/molecules/form-error/form-error";
import { cn } from "../../lib/cn";
import {
  CurrentPasswordField,
  NewPasswordField,
} from "../-account/access-fields";
import { settingRow } from "./setting-row";
import { type Passwords, usePasswordChange } from "./use-password-change";

/** The current password, the new one, and Change password. */
function PasswordForm({ onChanged }: { onChanged: () => void }) {
  const { t } = useTranslation();
  const change = usePasswordChange(onChanged);

  return (
    <Form<Passwords>
      errors={change.errors}
      onFormSubmit={change.submit}
      className="flex flex-col gap-m pb-m"
    >
      <CurrentPasswordField
        name="currentPassword"
        label={t("settings.password.current")}
      />
      <NewPasswordField label={t("settings.password.new")} />
      <FormError>{change.formError}</FormError>
      <Button
        type="submit"
        intent="primary"
        size="s"
        loading={change.pending}
        loadingLabel={t("settings.password.loading")}
        className="self-start"
      >
        {t("settings.password.action")}
      </Button>
    </Form>
  );
}

/**
 * “Change password”, which opens the two fields in place. Once changed, it
 * closes and says the other sessions are signed out.
 */
export function PasswordSetting() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [changed, setChanged] = useState(false);

  return (
    <Collapsible.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        setChanged(false);
      }}
    >
      <Collapsible.Trigger className={settingRow}>
        {t("settings.password.open")}
        <Icon
          icon={CaretDownIcon}
          size="s"
          className={cn(
            "text-secondary transition-transform duration-s ease-soft motion-reduce:transition-none",
            open ? "rotate-180" : "rotate-0",
          )}
        />
      </Collapsible.Trigger>
      <Collapsible.Panel>
        <PasswordForm
          onChanged={() => {
            setOpen(false);
            setChanged(true);
          }}
        />
      </Collapsible.Panel>
      <p
        aria-live="polite"
        className={cn("text-s text-success", changed ? "pb-m" : "")}
      >
        {changed ? t("settings.password.changed") : null}
      </p>
    </Collapsible.Root>
  );
}
