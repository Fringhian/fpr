import { Form } from "@base-ui/react/form";
import { useMutation } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import * as Field from "../../../components/molecules/field/field";
import { FormError } from "../../../components/molecules/form-error/form-error";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { useAccessChecks } from "../../../lib/access-checks";
import { useApi } from "../../../lib/api/use-api";
import { AccessPage } from "../-access/access-page";
import { useRefusal } from "../-access/use-refusal";

/** The email and reset key a reset sets a new password for. */
export type ResetPair = { email: string; key: string };

/**
 * A reset's first step: the email and the reset key the admin gave. A wrong
 * pair gets one error under the form, which never says which half is wrong.
 */
export function CheckStep({
  pair,
  onChecked,
}: {
  /** What the person entered before going back to this step. */
  pair: ResetPair | null;
  onChecked: (pair: ResetPair) => void;
}) {
  const { t } = useTranslation();
  const api = useApi();
  const checks = useAccessChecks();
  const { formError, refuse, refuseError } = useRefusal();
  const check = useMutation(api.access.checkReset.mutationOptions());

  const submit = (values: ResetPair) => {
    const entered = { email: values.email.trim(), key: values.key.trim() };
    refuse(null);
    check.mutate(entered, {
      onSuccess: () => onChecked(entered),
      onError: refuseError,
    });
  };

  return (
    <AccessPage
      back={{ render: <Link to="/sign-in" /> }}
      progress={{ step: 1, count: 2 }}
    >
      <Form<ResetPair> className="contents" onFormSubmit={submit}>
        <StepFlow.Body>
          <StepFlow.Question>{t("resetPassword.question")}</StepFlow.Question>
          <StepFlow.Description>
            {t("resetPassword.description")}
          </StepFlow.Description>
          <Field.Root name="email" validate={checks.email}>
            <Field.Label>{t("accessFields.email")}</Field.Label>
            <Field.Control
              type="email"
              autoComplete="username"
              spellCheck={false}
              defaultValue={pair?.email}
            />
            <Field.Error />
          </Field.Root>
          <Field.Root name="key" validate={checks.key}>
            <Field.Label>{t("resetPassword.key")}</Field.Label>
            <Field.Control
              autoComplete="off"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              placeholder={t("resetPassword.keyPlaceholder")}
              defaultValue={pair?.key}
            />
            <Field.Error />
          </Field.Root>
          <FormError>{formError}</FormError>
        </StepFlow.Body>
        <StepFlow.Actions>
          <StepFlow.MainButton
            type="submit"
            next
            loading={check.isPending}
            loadingLabel={t("resetPassword.checking")}
          >
            {t("resetPassword.check")}
          </StepFlow.MainButton>
        </StepFlow.Actions>
      </Form>
    </AccessPage>
  );
}
