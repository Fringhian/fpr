import { useTranslation } from "react-i18next";
import * as Field from "../../../components/molecules/field/field";
import { PASSWORD, useAccessChecks } from "../../../lib/access-checks";

/**
 * The email a person signs in with, named `email`. `autoComplete` is
 * `username` where a password is chosen beside it, so password managers save
 * the pair.
 */
export function EmailField({
  autoComplete = "email",
  defaultValue,
}: {
  autoComplete?: "email" | "username";
  defaultValue?: string | undefined;
}) {
  const { t } = useTranslation();
  const checks = useAccessChecks();

  return (
    <Field.Root name="email" validate={checks.email}>
      <Field.Label>{t("accessFields.email")}</Field.Label>
      <Field.Control
        type="email"
        autoComplete={autoComplete}
        spellCheck={false}
        defaultValue={defaultValue}
      />
      <Field.Error />
    </Field.Root>
  );
}

/**
 * The account a password is chosen for, hidden beside it: password managers
 * save the new password under this email.
 */
export function HiddenEmail({ email }: { email: string }) {
  return (
    <input type="email" autoComplete="username" value={email} readOnly hidden />
  );
}

/**
 * A display name, named `displayName`, with `help` under it. `label` stays
 * for screen readers alone with `hiddenLabel`, where the step's question
 * already asks for the name.
 */
export function DisplayNameField({
  label,
  help,
  hiddenLabel = false,
  ...props
}: {
  label: string;
  help: string;
  hiddenLabel?: boolean;
} & Pick<Field.ControlProps, "defaultValue" | "onValueChange">) {
  const checks = useAccessChecks();

  return (
    <Field.Root name="displayName" validate={checks.displayName}>
      <Field.Label className={hiddenLabel ? "sr-only" : undefined}>
        {label}
      </Field.Label>
      <Field.Control {...props} autoComplete="nickname" />
      <Field.Description>{help}</Field.Description>
      <Field.Error />
    </Field.Root>
  );
}

/** A password being chosen, named `password`, with Show and its length under it. */
export function NewPasswordField({ label }: { label?: string }) {
  const { t } = useTranslation();
  const checks = useAccessChecks();

  return (
    <Field.Root name="password" validate={checks.newPassword}>
      <Field.Label>{label ?? t("accessFields.password")}</Field.Label>
      <Field.Password autoComplete="new-password" />
      <Field.Description>
        {t("accessFields.passwordHelp", { min: PASSWORD.min })}
      </Field.Description>
      <Field.Error />
    </Field.Root>
  );
}
