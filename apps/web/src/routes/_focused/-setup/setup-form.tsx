import { Form } from "@base-ui/react/form";
import type { SetupBody } from "@fpr/contracts";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import * as Field from "../../../components/molecules/field/field";
import { FormError } from "../../../components/molecules/form-error/form-error";
import * as StepFlow from "../../../components/templates/step-flow/step-flow";
import { useAccessChecks } from "../../../lib/access-checks";
import { isApiError } from "../../../lib/api/errors";
import { useApi } from "../../../lib/api/use-api";
import { EmailField, NewPasswordField } from "../-access/access-fields";
import { AccessPage } from "../-access/access-page";
import { useRefusal } from "../-access/use-refusal";

/** The fields the API knows the answer of but the form can't check. */
const blame = { invalid_bootstrap_key: "bootstrapKey" } as const;

/**
 * The first admin: the setup key from the server's configuration, then the
 * admin's email, name and password. Created, the admin is signed in and
 * starts onboarding. An admin created meanwhile closes the page.
 */
export function SetupForm({ onClosed }: { onClosed: () => void }) {
  const { t } = useTranslation();
  const api = useApi();
  const navigate = useNavigate();
  const checks = useAccessChecks();
  const { errors, formError, refuse, refuseError } = useRefusal(blame);
  const setup = useMutation(api.access.setup.mutationOptions());

  const submit = ({
    bootstrapKey,
    email,
    displayName,
    password,
  }: SetupBody) => {
    refuse(null);
    setup.mutate(
      {
        bootstrapKey: bootstrapKey.trim(),
        email: email.trim(),
        displayName: displayName.trim(),
        password,
      },
      {
        onSuccess: () => navigate({ to: "/onboarding", replace: true }),
        onError: (error) =>
          isApiError(error, "admin_exists") ? onClosed() : refuseError(error),
      },
    );
  };

  return (
    <AccessPage>
      <Form<SetupBody>
        className="contents"
        errors={errors}
        onFormSubmit={submit}
      >
        <StepFlow.Body>
          <StepFlow.Question>{t("setup.question")}</StepFlow.Question>
          <StepFlow.Description>{t("setup.description")}</StepFlow.Description>
          <Field.Root name="bootstrapKey" validate={checks.key}>
            <Field.Label>{t("setup.key")}</Field.Label>
            <Field.Password autoComplete="off" />
            <Field.Error />
          </Field.Root>
          <EmailField autoComplete="username" />
          <Field.Root name="displayName" validate={checks.displayName}>
            <Field.Label>{t("setup.name")}</Field.Label>
            <Field.Control autoComplete="nickname" />
            <Field.Description>{t("setup.nameHelp")}</Field.Description>
            <Field.Error />
          </Field.Root>
          <NewPasswordField />
          <FormError>{formError}</FormError>
        </StepFlow.Body>
        <StepFlow.Actions>
          <StepFlow.MainButton
            type="submit"
            next
            loading={setup.isPending}
            loadingLabel={t("setup.loading")}
          >
            {t("setup.action")}
          </StepFlow.MainButton>
        </StepFlow.Actions>
      </Form>
    </AccessPage>
  );
}
