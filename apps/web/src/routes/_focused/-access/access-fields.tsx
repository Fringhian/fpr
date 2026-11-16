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
